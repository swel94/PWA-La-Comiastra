-- 0005_breaks_blocks_and_90day_window.sql
-- Descansos recurrentes + días bloqueados + ventana de 90 días.

-- 1. Descansos recurrentes por día de la semana (ej. lunes 13:00–15:00)
create table if not exists public.availability_breaks (
  id          uuid primary key default gen_random_uuid(),
  day_of_week integer not null check (day_of_week between 1 and 7),
  start_time  time not null,
  end_time    time not null,
  created_at  timestamptz not null default now(),
  constraint break_time_valid check (end_time > start_time)
);

-- 2. Días bloqueados (una fecha concreta, sin alterar el resto)
create table if not exists public.blocked_days (
  id         uuid primary key default gen_random_uuid(),
  day        date not null unique,
  created_at timestamptz not null default now()
);

alter table public.availability_breaks enable row level security;
alter table public.blocked_days enable row level security;

drop policy if exists availability_breaks_admin_all on public.availability_breaks;
create policy availability_breaks_admin_all on public.availability_breaks
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists blocked_days_admin_all on public.blocked_days;
create policy blocked_days_admin_all on public.blocked_days
  for all using (public.is_admin()) with check (public.is_admin());

-- 3. get_available_slots: respeta días bloqueados y descansos
create or replace function public.get_available_slots(
  p_service_id uuid,
  p_day date,
  p_tz text default 'America/Santo_Domingo'
)
returns table (slot_start timestamptz, slot_end timestamptz)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_duration interval;
  v_av public.availability%rowtype;
  v_buffer int;
  v_granularity interval := interval '15 minutes';
  v_cursor timestamptz;
  v_limit timestamptz;
begin
  if exists (select 1 from public.blocked_days bd where bd.day = p_day) then
    return;
  end if;

  select make_interval(mins => duration_minutes)
    into v_duration
    from public.services
   where id = p_service_id and is_active = true;

  if v_duration is null then
    raise exception 'Servicio no disponible';
  end if;

  select * into v_av from public.availability
   where day_of_week = extract(isodow from p_day);

  if not found or v_av.is_off then
    return;
  end if;

  v_buffer := coalesce(v_av.buffer_minutes, 0);

  v_cursor := (p_day + v_av.start_time) at time zone p_tz;
  v_limit  := (p_day + v_av.end_time)   at time zone p_tz - v_duration;

  while v_cursor <= v_limit loop
    if not exists (
      select 1 from public.appointments a
      where a.status not in ('cancelled','no_show')
        and tstzrange(v_cursor - make_interval(mins => v_buffer),
                      v_cursor + v_duration + make_interval(mins => v_buffer), '[)')
            && tstzrange(a.start_at - make_interval(mins => a.buffer_before_min),
                         a.end_at   + make_interval(mins => a.buffer_after_min), '[)')
    )
    and not exists (
      select 1 from public.blocked_slots b
      where tstzrange(v_cursor, v_cursor + v_duration, '[)')
            && tstzrange(b.start_at, b.end_at, '[)')
    )
    and not exists (
      select 1 from public.availability_breaks br
      where br.day_of_week = extract(isodow from p_day)::int
        and tstzrange((p_day + br.start_time) at time zone p_tz,
                      (p_day + br.end_time) at time zone p_tz, '[)')
            && tstzrange(v_cursor, v_cursor + v_duration, '[)')
    ) then
      slot_start := v_cursor;
      slot_end   := v_cursor + v_duration;
      return next;
    end if;
    v_cursor := v_cursor + v_granularity;
  end loop;
end;
$$;

-- 4. create_booking: ventana de 90 días + bloqueos + descansos
create or replace function public.create_booking(
  p_service_ids uuid[],
  p_start_at timestamptz
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_customer_id uuid;
  v_duration interval := interval '0';
  v_end_at timestamptz;
  v_appt_id uuid;
  v_price numeric(12,2);
  s uuid;
  v_tz constant text := 'America/Santo_Domingo';
  v_day date;
begin
  if p_start_at <= now() then
    raise exception 'La fecha y hora deben ser futuras';
  end if;

  if p_start_at > now() + interval '90 days' then
    raise exception 'Solo se puede reservar con hasta 90 días de anticipación';
  end if;

  v_day := (p_start_at at time zone v_tz)::date;

  if exists (select 1 from public.blocked_days bd where bd.day = v_day) then
    raise exception 'Ese día no está disponible';
  end if;

  select id into v_customer_id from public.customers
   where profile_id = public.current_profile_id();

  if v_customer_id is null then
    raise exception 'Cliente no encontrado. Completa tu ficha primero.'
      using errcode = 'P0001';
  end if;

  select coalesce(sum(make_interval(mins => duration_minutes)), interval '0')
    into v_duration
    from public.services
   where id = any(p_service_ids) and is_active = true;

  if v_duration = interval '0' then
    raise exception 'Servicio no válido';
  end if;

  v_end_at := p_start_at + v_duration;

  perform pg_advisory_xact_lock(hashtext('la_cosmiatra_booking'));

  if exists (
    select 1 from public.appointments a
    where a.status not in ('cancelled','no_show')
      and tstzrange(p_start_at, v_end_at, '[)')
          && tstzrange(a.start_at - make_interval(mins => a.buffer_before_min),
                       a.end_at   + make_interval(mins => a.buffer_after_min), '[)')
  ) then
    raise exception 'El horario ya no está disponible'
      using errcode = 'P0001', hint = 'Por favor elige otro horario.';
  end if;

  if exists (
    select 1 from public.blocked_slots b
    where tstzrange(p_start_at, v_end_at, '[)')
          && tstzrange(b.start_at, b.end_at, '[)')
  ) then
    raise exception 'El horario no está disponible';
  end if;

  if exists (
    select 1 from public.availability_breaks br
    where br.day_of_week = extract(isodow from v_day)::int
      and tstzrange((v_day + br.start_time) at time zone v_tz,
                    (v_day + br.end_time) at time zone v_tz, '[)')
          && tstzrange(p_start_at, v_end_at, '[)')
  ) then
    raise exception 'El horario no está disponible';
  end if;

  insert into public.appointments (customer_id, status, start_at, end_at)
  values (v_customer_id, 'confirmed', p_start_at, v_end_at)
  returning id into v_appt_id;

  foreach s in array p_service_ids loop
    select internal_price into v_price
      from public.service_pricing where service_id = s;
    v_price := coalesce(v_price, 0);

    insert into public.appointment_services
      (appointment_id, service_id, price_at_booking)
    values (v_appt_id, s, v_price);
  end loop;

  return v_appt_id;
end;
$$;
