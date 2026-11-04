-- 0001_initial_schema.sql
-- La Cosmiatra — esquema inicial (Supabase / Postgres 15+)
-- Ejecutar en el SQL Editor de Supabase (o `supabase db push`).

-- =========================================================
-- 1. Extensiones
-- =========================================================
create extension if not exists pgcrypto;
-- Para webhooks (calendar sync / notificaciones) y recordatorios:
-- create extension if not exists pg_net;
-- create extension if not exists pg_cron;

-- =========================================================
-- 2. Enums
-- =========================================================
create type public.user_role as enum ('customer', 'admin');
create type public.appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
create type public.inventory_txn_type as enum ('in', 'out', 'adjustment', 'sale');

-- =========================================================
-- 3. profiles (un registro por usuario autenticado)
-- =========================================================
create table public.profiles (
  id           uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  role         public.user_role not null default 'customer',
  full_name    text not null default '',
  email        text not null default '',
  phone        text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- =========================================================
-- 4. Funciones auxiliares (requieren `profiles`)
-- =========================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where auth_user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where auth_user_id = auth.uid();
$$;

-- =========================================================
-- 5. customers (perfil de negocio + ficha clínica)
-- =========================================================
create table public.customers (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid not null unique references public.profiles (id) on delete cascade,
  sex                 text check (sex in ('hombre','mujer')),
  age                 integer check (age between 0 and 120),
  occupation          text,
  motivo_visita       text[],
  clinical            jsonb not null default '{}'::jsonb,
  consent             boolean not null default false,
  consent_at          timestamptz,
  intake_completed_at timestamptz,
  admin_notes         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- =========================================================
-- 6. services + service_pricing (precio interno separado)
-- =========================================================
create table public.services (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text,
  duration_minutes integer not null check (duration_minutes > 0),
  category         text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.service_pricing (
  service_id     uuid primary key references public.services (id) on delete cascade,
  internal_price numeric(12,2) not null default 0 check (internal_price >= 0),
  updated_at     timestamptz not null default now()
);

-- =========================================================
-- 7. appointments (con guarda de no-doble-reserva)
-- =========================================================
create table public.appointments (
  id                uuid primary key default gen_random_uuid(),
  customer_id       uuid not null references public.customers (id) on delete cascade,
  status            public.appointment_status not null default 'confirmed',
  start_at          timestamptz not null,
  end_at            timestamptz not null,
  buffer_before_min integer not null default 0,
  buffer_after_min  integer not null default 0,
  google_event_id   text unique,
  cancel_reason     text,
  admin_note        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint appointments_time_valid check (end_at > start_at)
);

-- La protección contra doble reserva se implementa con un trigger (sección 13),
-- ya que las columnas generadas no admiten funciones no inmutables (tstzrange).

-- =========================================================
-- 8. appointment_services / appointment_notes
-- =========================================================
create table public.appointment_services (
  id               uuid primary key default gen_random_uuid(),
  appointment_id   uuid not null references public.appointments (id) on delete cascade,
  service_id       uuid not null references public.services (id),
  price_at_booking numeric(12,2) not null default 0,
  created_at       timestamptz not null default now(),
  unique (appointment_id, service_id)
);

create table public.appointment_notes (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  author_id      uuid not null references public.profiles (id),
  note_type      text not null default 'general',
  content        text not null,
  created_at     timestamptz not null default now()
);

-- =========================================================
-- 9. products / inventory_transactions / sale_items
-- =========================================================
create table public.products (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  sku                 text unique,
  category            text,
  supplier            text,
  unit                text not null default 'unit',
  cost_price          numeric(12,2) not null default 0 check (cost_price >= 0),
  sell_price          numeric(12,2) not null default 0 check (sell_price >= 0),
  quantity_on_hand    integer not null default 0 check (quantity_on_hand >= 0),
  low_stock_threshold integer not null default 0 check (low_stock_threshold >= 0),
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table public.inventory_transactions (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references public.products (id) on delete cascade,
  type            public.inventory_txn_type not null,
  quantity_delta  integer not null check (quantity_delta <> 0),
  reason          text,
  appointment_id  uuid references public.appointments (id) on delete set null,
  created_by      uuid references public.profiles (id),
  created_at      timestamptz not null default now()
);

create table public.sale_items (
  id                 uuid primary key default gen_random_uuid(),
  appointment_id     uuid not null references public.appointments (id) on delete cascade,
  product_id         uuid not null references public.products (id),
  quantity           integer not null check (quantity > 0),
  sell_price_at_sale numeric(12,2) not null check (sell_price_at_sale >= 0),
  cost_at_sale       numeric(12,2) not null default 0 check (cost_at_sale >= 0),
  created_at         timestamptz not null default now()
);

-- =========================================================
-- 10. availability / blocked_slots / settings / google_credentials
-- =========================================================
create table public.availability (
  id             uuid primary key default gen_random_uuid(),
  day_of_week    integer not null check (day_of_week between 1 and 7),
  start_time     time not null,
  end_time       time not null,
  buffer_minutes integer not null default 0,
  is_off         boolean not null default false,
  unique (day_of_week)
);

create table public.blocked_slots (
  id         uuid primary key default gen_random_uuid(),
  start_at   timestamptz not null,
  end_at     timestamptz not null,
  reason     text,
  created_at timestamptz not null default now(),
  constraint blocked_slots_time_valid check (end_at > start_at)
);

create table public.settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.google_credentials (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null unique references public.profiles (id) on delete cascade,
  calendar_id text not null,
  vault_ref   text not null,
  expires_at  timestamptz,
  updated_at  timestamptz not null default now()
);

-- =========================================================
-- 11. Row Level Security
-- =========================================================
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.services enable row level security;
alter table public.service_pricing enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_services enable row level security;
alter table public.appointment_notes enable row level security;
alter table public.products enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.sale_items enable row level security;
alter table public.availability enable row level security;
alter table public.blocked_slots enable row level security;
alter table public.settings enable row level security;
alter table public.google_credentials enable row level security;

-- profiles
create policy profiles_select on public.profiles
  for select using (auth_user_id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles
  for update using (auth_user_id = auth.uid() or public.is_admin());
create policy profiles_insert on public.profiles
  for insert with check (auth_user_id = auth.uid() or public.is_admin());
create policy profiles_delete on public.profiles
  for delete using (public.is_admin());

-- customers
create policy customers_select on public.customers
  for select using (profile_id = public.current_profile_id() or public.is_admin());
create policy customers_insert on public.customers
  for insert with check (profile_id = public.current_profile_id() or public.is_admin());
create policy customers_update on public.customers
  for update using (profile_id = public.current_profile_id() or public.is_admin());
create policy customers_delete on public.customers
  for delete using (public.is_admin());

-- services (público, sin precio)
create policy services_public_select on public.services
  for select using (is_active = true);
create policy services_admin_all on public.services
  for all using (public.is_admin()) with check (public.is_admin());

-- service_pricing (solo admin)
create policy service_pricing_admin_all on public.service_pricing
  for all using (public.is_admin()) with check (public.is_admin());

-- appointments
create policy appointments_select on public.appointments
  for select using (
    customer_id in (select id from public.customers where profile_id = public.current_profile_id())
    or public.is_admin()
  );
create policy appointments_insert on public.appointments
  for insert with check (
    customer_id in (select id from public.customers where profile_id = public.current_profile_id())
    or public.is_admin()
  );
create policy appointments_update on public.appointments
  for update using (
    customer_id in (select id from public.customers where profile_id = public.current_profile_id())
    or public.is_admin()
  );
create policy appointments_delete on public.appointments
  for delete using (public.is_admin());

-- appointment_services
create policy appointment_services_select on public.appointment_services
  for select using (
    appointment_id in (select a.id from public.appointments a
                       join public.customers c on c.id = a.customer_id
                       where c.profile_id = public.current_profile_id())
    or public.is_admin()
  );
create policy appointment_services_write on public.appointment_services
  for all using (public.is_admin()) with check (public.is_admin());

-- appointment_notes (solo admin)
create policy appointment_notes_admin_all on public.appointment_notes
  for all using (public.is_admin()) with check (public.is_admin());

-- products (solo admin)
create policy products_admin_all on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- inventory_transactions (solo admin)
create policy inventory_txn_admin_all on public.inventory_transactions
  for all using (public.is_admin()) with check (public.is_admin());

-- sale_items (solo admin)
create policy sale_items_admin_all on public.sale_items
  for all using (public.is_admin()) with check (public.is_admin());

-- availability (lectura pública)
create policy availability_public_select on public.availability
  for select using (true);
create policy availability_admin_write on public.availability
  for all using (public.is_admin()) with check (public.is_admin());

-- blocked_slots (solo admin)
create policy blocked_slots_admin_all on public.blocked_slots
  for all using (public.is_admin()) with check (public.is_admin());

-- settings (lectura pública de claves no sensibles)
create policy settings_public_select on public.settings
  for select using (true);
create policy settings_admin_write on public.settings
  for all using (public.is_admin()) with check (public.is_admin());

-- google_credentials (solo admin)
create policy google_credentials_admin_all on public.google_credentials
  for all using (public.is_admin()) with check (public.is_admin());

-- =========================================================
-- 12. Funciones RPC (núcleo atómico)
-- =========================================================
create or replace function public.get_available_slots(
  p_service_id uuid,
  p_day date,
  p_tz text default 'America/Santo_Domingo'
)
returns table (slot_start timestamptz, slot_end timestamptz)
language plpgsql stable security invoker set search_path = public
as $$
declare
  v_duration interval;
  v_av public.availability%rowtype;
  v_buffer int;
  v_granularity interval := interval '15 minutes';
  v_cursor timestamptz;
  v_limit timestamptz;
begin
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
    ) then
      slot_start := v_cursor;
      slot_end   := v_cursor + v_duration;
      return next;
    end if;
    v_cursor := v_cursor + v_granularity;
  end loop;
end;
$$;

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
  select id into v_customer_id from public.customers
   where profile_id = public.current_profile_id();

  if v_customer_id is null then
    raise exception 'Cliente no encontrado. Complete su ficha primero.'
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

create or replace function public.cancel_booking(
  p_appointment_id uuid,
  p_reason text default null
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    if exists (
      select 1 from public.appointments a
      join public.customers c on c.id = a.customer_id
      where a.id = p_appointment_id
        and c.profile_id = public.current_profile_id()
        and a.status in ('confirmed','pending')
        and a.start_at < now() + interval '24 hours'
    ) then
      raise exception 'Solo puedes cancelar con al menos 24 horas de antelación';
    end if;
  end if;

  update public.appointments
     set status = 'cancelled',
         cancel_reason = p_reason,
         updated_at = now()
   where id = p_appointment_id
     and (public.is_admin()
          or customer_id in (select id from public.customers
                              where profile_id = public.current_profile_id()))
     and status in ('confirmed','pending');

  if not found then
    raise exception 'La cita no se puede cancelar';
  end if;
end;
$$;

-- =========================================================
-- 13. Triggers
-- =========================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (auth_user_id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), 'customer')
  on conflict (auth_user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch  before update on public.profiles  for each row execute function public.touch_updated_at();
create trigger customers_touch before update on public.customers for each row execute function public.touch_updated_at();
create trigger services_touch  before update on public.services  for each row execute function public.touch_updated_at();
create trigger products_touch  before update on public.products  for each row execute function public.touch_updated_at();

create or replace function public.apply_inventory_txn()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.products
     set quantity_on_hand = quantity_on_hand + new.quantity_delta,
         updated_at = now()
   where id = new.product_id;

  if not found then
    raise exception 'product % does not exist', new.product_id;
  end if;

  return new;
end;
$$;

create trigger inventory_txn_after_insert
  after insert on public.inventory_transactions
  for each row execute function public.apply_inventory_txn();

create or replace function public.record_sale()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.inventory_transactions
    (product_id, type, quantity_delta, reason, appointment_id, created_by)
  values
    (new.product_id, 'sale', -new.quantity, 'Venta registrada', new.appointment_id, auth.uid());

  return new;
end;
$$;

create trigger sale_item_after_insert
  after insert on public.sale_items
  for each row execute function public.record_sale();

-- Protección contra doble reserva (reemplaza la exclusión con columna generada).
create or replace function public.check_appointment_overlap()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext('la_cosmiatra_booking'));

  if new.status not in ('cancelled','no_show') then
    if exists (
      select 1 from public.appointments a
      where a.id is distinct from new.id
        and a.status not in ('cancelled','no_show')
        and tstzrange(a.start_at - make_interval(mins => a.buffer_before_min),
                      a.end_at   + make_interval(mins => a.buffer_after_min), '[)')
            && tstzrange(new.start_at - make_interval(mins => new.buffer_before_min),
                         new.end_at   + make_interval(mins => new.buffer_after_min), '[)')
    ) then
      raise exception 'El horario ya no está disponible' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger appointments_no_overlap_trigger
  before insert or update on public.appointments
  for each row execute function public.check_appointment_overlap();

-- =========================================================
-- 14. Índices
-- =========================================================
create index idx_appointments_customer on public.appointments (customer_id);
create index idx_appointments_start_at on public.appointments (start_at);
create index idx_appointments_status   on public.appointments (status);
create index idx_appointment_notes_appt on public.appointment_notes (appointment_id);
create index idx_inventory_txn_product on public.inventory_transactions (product_id, created_at);
create index idx_sale_items_appt       on public.sale_items (appointment_id);
create index idx_sale_items_product    on public.sale_items (product_id);
create index idx_customers_profile     on public.customers (profile_id);
create index idx_customers_clinical    on public.customers using gin (clinical);

-- =========================================================
-- 15. Vistas de reporte (ingresos)
-- =========================================================
create or replace view public.v_service_revenue as
select
  a.id as appointment_id,
  a.start_at,
  sum(coalesce(aps.price_at_booking, 0)) as service_revenue
from public.appointments a
left join public.appointment_services aps on aps.appointment_id = a.id
where a.status = 'completed'
group by a.id, a.start_at;

create or replace view public.v_product_sales as
select
  s.appointment_id,
  s.product_id,
  p.name as product_name,
  s.quantity,
  s.sell_price_at_sale,
  s.cost_at_sale,
  (s.sell_price_at_sale - s.cost_at_sale) as profit_per_unit,
  (s.sell_price_at_sale - s.cost_at_sale) * s.quantity as profit_total
from public.sale_items s
join public.products p on p.id = s.product_id;

-- =========================================================
-- 16. Semillas (configuración)
-- =========================================================
insert into public.settings (key, value) values
  ('currency', '"DOP"'),
  ('timezone', '"America/Santo_Domingo"'),
  ('business_name', '"La Cosmiatra"'),
  ('brand_colors', '{"camel":"#bb9457","apricot":"#ffe6a7","chocolate":"#99582a","coffee":"#432818"}'),
  ('cancel_window_hours', '24')
on conflict (key) do nothing;
