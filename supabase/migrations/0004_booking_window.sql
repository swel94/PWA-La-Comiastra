-- 0004_booking_window_and_availability.sql
-- Límite de reserva: solo hasta 30 días de anticipación.

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
begin
  if p_start_at <= now() then
    raise exception 'La fecha y hora deben ser futuras';
  end if;

  if p_start_at > now() + interval '30 days' then
    raise exception 'Solo se puede reservar con hasta 30 días de anticipación';
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
