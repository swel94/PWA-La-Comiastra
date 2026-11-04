# Database Schema Spec — La Cosmiatra (Supabase / Postgres)

> **Status:** Draft v0.1 — Step 2 of the roadmap. Companion to `PROJECT_ROADMAP.md`.
> **Engine:** Supabase (Postgres 15+). Uses Auth, RLS, and Vault.

This document defines the exact tables, columns, constraints, indexes, triggers, and Row Level Security (RLS) policies. It is the source of truth the developer implements as SQL migrations.

---

## 1. Conventions

| Convention | Rule |
|-----------|------|
| Primary keys | `uuid` via `gen_random_uuid()` |
| Timestamps | `timestamptz` (UTC internally; display in `America/Santo_Domingo`) |
| Money | `numeric(12,2)` (Dominican pesos, DOP) |
| Enums | Postgres `enum` for closed sets (status, role, transaction type) |
| Audit | every mutable table has `created_at` / `updated_at` |
| Soft delete | prefer `is_active` boolean over hard delete for services/products |
| Extensions | `pgcrypto` (UUIDs), `pg_graphql`/`pg_net` optional |

Enable once in the migration:
```sql
create extension if not exists pgcrypto;
```

---

## 2. Roles & Auth

- **`anon`** — unauthenticated visitors (landing page, public service list, availability).
- **`authenticated`** — logged-in users. Split by `profiles.role`:
  - `customer` — books/manages own data.
  - `admin` — the esthetician; full access.
- **`service_role`** — server-side only (Edge Functions). Bypasses RLS; never exposed to the browser.

Helper used by most policies:
```sql
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
```

---

## 3. Enums

```sql
create type public.user_role as enum ('customer', 'admin');

create type public.appointment_status as enum (
  'pending',      -- reserved, not yet accepted (kept for flexibility; default flow uses 'confirmed')
  'confirmed',    -- auto-confirmed booking
  'completed',
  'cancelled',
  'no_show'
);

create type public.inventory_txn_type as enum ('in', 'out', 'adjustment', 'sale');
```

---

## 4. Tables

### 4.1 `profiles` — one row per auth user

Mirrors `auth.users` and adds the app role.

```sql
create table public.profiles (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid not null unique references auth.users (id) on delete cascade,
  role          public.user_role not null default 'customer',
  full_name     text not null default '',
  email         text not null default '',
  phone         text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
```

**RLS**
```sql
alter table public.profiles enable row level security;

-- users can read their own profile; admin reads all
create policy profiles_select on public.profiles
  for select using (auth_user_id = auth.uid() or public.is_admin());

-- users can update their own profile but NOT their role; admin can update anything
create policy profiles_update on public.profiles
  for update using (auth_user_id = auth.uid() or public.is_admin());

-- insert only via the signup trigger or by an admin
create policy profiles_insert on public.profiles
  for insert with check (auth_user_id = auth.uid() or public.is_admin());

-- deletion is admin-only
create policy profiles_delete on public.profiles
  for delete using (public.is_admin());
```

---

### 4.2 `customers` — business profile + intake data

One row per customer (admin has a `profiles` row but no `customers` row).

```sql
create table public.customers (
  id                 uuid primary key default gen_random_uuid(),
  profile_id         uuid not null unique references public.profiles (id) on delete cascade,
  sex                text check (sex in ('hombre','mujer')),
  age                integer check (age between 0 and 120),
  occupation         text,
  motivo_visita      text[],           -- multi-select: acné, rosácea, manchas, arrugas, blanqueamiento corporal, mantenimiento, otros
  clinical           jsonb not null default '{}'::jsonb,   -- "Datos Clínicos" questionnaire (shape below)
  consent            boolean not null default false,
  consent_at         timestamptz,
  intake_completed_at timestamptz,     -- null until the Ficha Clínica is submitted
  admin_notes        text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
```

**`clinical` JSONB shape** (keys are stable; values are strings/arrays):
```json
{
  "tratamiento_dermatologico_previo": {"respuesta": "no|otro", "detalle": ""},
  "tratamiento_dermatologico_curso":  {"respuesta": "no|otro", "detalle": ""},
  "condiciones": ["tiroides","ovarios_poliquisticos","diabetes","presion_arterial","dermatitis_atopica","asma","cancer","rinitis_alergica","otros"],
  "cirugia_estetica_reciente":         {"respuesta": "no|otro", "detalle": ""},
  "niveles_tiroideos": "menor_20|20_50|50_100|mayor_100|desconozco",
  "niveles_vitamina_d": "si|no|na",
  "medicamento_actual":                {"respuesta": "si|no|na", "detalle": ""},
  "lactando": "si|no",
  "embarazada": "si|no|na",
  "protesis_dental": "si|no",
  "periodo_regular": "si|no|na",
  "alcohol": "si|no",
  "alergias":                           {"respuesta": "si|no", "detalle": ""},
  "puede_tomar_ainees": "si|no",       -- aspirina / diclofenac / ibuprofeno
  "rutina_facial":                      {"respuesta": "si|no", "detalle": ""},
  "tratamiento_facial_previo": "si|no"
}
```

**RLS**
```sql
alter table public.customers enable row level security;

-- customer reads/updates only their own row; admin reads/updates all
create policy customers_select on public.customers
  for select using (profile_id = public.current_profile_id() or public.is_admin());

create policy customers_insert on public.customers
  for insert with check (profile_id = public.current_profile_id() or public.is_admin());

create policy customers_update on public.customers
  for update using (profile_id = public.current_profile_id() or public.is_admin());

create policy customers_delete on public.customers
  for delete using (public.is_admin());
```

---

### 4.3 `services` — public-facing service info (NO price)

```sql
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
```

**RLS** — public can read active services (price lives in `service_pricing`):
```sql
alter table public.services enable row level security;

create policy services_public_select on public.services
  for select using (is_active = true);

create policy services_admin_all on public.services
  for all using (public.is_admin()) with check (public.is_admin());
```

---

### 4.4 `service_pricing` — internal price (admin-only)

Separated so the price can never leak to the public/customer role.

```sql
create table public.service_pricing (
  service_id     uuid primary key references public.services (id) on delete cascade,
  internal_price numeric(12,2) not null default 0 check (internal_price >= 0),
  updated_at     timestamptz not null default now()
);
```

**RLS**
```sql
alter table public.service_pricing enable row level security;

create policy service_pricing_admin_all on public.service_pricing
  for all using (public.is_admin()) with check (public.is_admin());
```

> **Note:** the admin UI reads price here; the landing page only queries `services`.

---

### 4.5 `appointments` — the core booking record

```sql
create table public.appointments (
  id                uuid primary key default gen_random_uuid(),
  customer_id       uuid not null references public.customers (id) on delete cascade,
  status            public.appointment_status not null default 'confirmed',
  start_at          timestamptz not null,
  end_at            timestamptz not null,
  buffer_before_min integer not null default 0,
  buffer_after_min  integer not null default 0,
  google_event_id   text unique,           -- populated after Google Calendar create
  cancel_reason     text,
  admin_note        text,                  -- quick internal note (distinct from treatment log)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint appointments_time_valid check (end_at > start_at)
);
```

**RLS**
```sql
alter table public.appointments enable row level security;

-- customer sees own appointments; admin sees all
create policy appointments_select on public.appointments
  for select using (
    customer_id in (select id from public.customers where profile_id = public.current_profile_id())
    or public.is_admin()
  );

-- customer can create (book) and cancel/reschedule own; admin all
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
```

---

### 4.6 `appointment_services` — services in an appointment (many-to-many)

```sql
create table public.appointment_services (
  id               uuid primary key default gen_random_uuid(),
  appointment_id   uuid not null references public.appointments (id) on delete cascade,
  service_id       uuid not null references public.services (id),
  price_at_booking numeric(12,2) not null default 0,   -- snapshot of internal price at booking
  created_at       timestamptz not null default now(),
  unique (appointment_id, service_id)
);
```

**RLS** — same visibility as appointments:
```sql
alter table public.appointment_services enable row level security;

create policy appointment_services_select on public.appointment_services
  for select using (
    appointment_id in (select a.id from public.appointments a
                       join public.customers c on c.id = a.customer_id
                       where c.profile_id = public.current_profile_id())
    or public.is_admin()
  );

create policy appointment_services_write on public.appointment_services
  for all using (public.is_admin()) with check (public.is_admin());
```

---

### 4.7 `appointment_notes` — per-appointment treatment log

Timestamped comments the esthetician adds before/during/after a visit.

```sql
create table public.appointment_notes (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  author_id      uuid not null references public.profiles (id),
  note_type      text not null default 'general',   -- general | before | during | after | product
  content        text not null,
  created_at     timestamptz not null default now()
);
```

**RLS** — admin-only (treatment notes are internal):
```sql
alter table public.appointment_notes enable row level security;

create policy appointment_notes_admin_all on public.appointment_notes
  for all using (public.is_admin()) with check (public.is_admin());
```

---

### 4.8 `products` — retail inventory items

```sql
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
```

> **Profit** is computed, never stored: `profit = sell_price - cost_price`; `margin = (sell - cost) / sell`. Low stock = `quantity_on_hand <= low_stock_threshold`.

**RLS** — internal (admin-only). No public exposure:
```sql
alter table public.products enable row level security;

create policy products_admin_all on public.products
  for all using (public.is_admin()) with check (public.is_admin());
```

---

### 4.9 `inventory_transactions` — immutable audit trail

`quantity_on_hand` is derived from this log; it is never edited directly.

```sql
create table public.inventory_transactions (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references public.products (id) on delete cascade,
  type            public.inventory_txn_type not null,
  quantity_delta  integer not null check (quantity_delta <> 0),
  reason          text,
  appointment_id  uuid references public.appointments (id) on delete set null,  -- set when type='sale'
  created_by      uuid references public.profiles (id),
  created_at      timestamptz not null default now()
);
```

**RLS** — admin-only:
```sql
alter table public.inventory_transactions enable row level security;

create policy inventory_txn_admin_all on public.inventory_transactions
  for all using (public.is_admin()) with check (public.is_admin());
```

---

### 4.10 `sale_items` — products sold at an appointment

Recording a sale decrements inventory (see trigger §5.3).

```sql
create table public.sale_items (
  id                uuid primary key default gen_random_uuid(),
  appointment_id    uuid not null references public.appointments (id) on delete cascade,
  product_id        uuid not null references public.products (id),
  quantity          integer not null check (quantity > 0),
  sell_price_at_sale numeric(12,2) not null check (sell_price_at_sale >= 0),
  cost_at_sale      numeric(12,2) not null default 0 check (cost_at_sale >= 0),
  created_at        timestamptz not null default now()
);
```

**RLS** — admin-only:
```sql
alter table public.sale_items enable row level security;

create policy sale_items_admin_all on public.sale_items
  for all using (public.is_admin()) with check (public.is_admin());
```

---

### 4.11 `availability` — recurring weekly working hours

```sql
create table public.availability (
  id             uuid primary key default gen_random_uuid(),
  day_of_week    integer not null check (day_of_week between 1 and 7),  -- 1=Mon ... 7=Sun
  start_time     time not null,
  end_time       time not null,
  buffer_minutes integer not null default 0,
  is_off         boolean not null default false,   -- true = closed that day
  unique (day_of_week)
);
```

**RLS** — public can read (to show open slots); admin can write:
```sql
alter table public.availability enable row level security;

create policy availability_public_select on public.availability
  for select using (true);

create policy availability_admin_write on public.availability
  for all using (public.is_admin()) with check (public.is_admin());
```

---

### 4.12 `blocked_slots` — one-off closures / time off

```sql
create table public.blocked_slots (
  id         uuid primary key default gen_random_uuid(),
  start_at   timestamptz not null,
  end_at     timestamptz not null,
  reason     text,
  created_at timestamptz not null default now(),
  constraint blocked_slots_time_valid check (end_at > start_at)
);
```

**RLS** — admin-only:
```sql
alter table public.blocked_slots enable row level security;

create policy blocked_slots_admin_all on public.blocked_slots
  for all using (public.is_admin()) with check (public.is_admin());
```

---

### 4.13 `settings` — business configuration (key/value)

```sql
create table public.settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
```

Seed keys:
```text
currency            → "DOP"
timezone            → "America/Santo_Domingo"
business_name       → "La Cosmiatra"
brand_colors        → { "primary": "#...", "accent": "#...", "background": "#..." }   (brown/pink/butter palette)
cancel_window_hours → 24
```

**RLS** — read public (non-sensitive); write admin:
```sql
alter table public.settings enable row level security;

create policy settings_public_select on public.settings
  for select using (true);

create policy settings_admin_write on public.settings
  for all using (public.is_admin()) with check (public.is_admin());
```

---

### 4.14 `google_credentials` — OAuth metadata (tokens live in Vault)

```sql
create table public.google_credentials (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null unique references public.profiles (id) on delete cascade,
  calendar_id text not null,                 -- the esthetician's calendar email
  vault_ref   text not null,                 -- reference to the encrypted tokens in Vault
  expires_at  timestamptz,
  updated_at  timestamptz not null default now()
);
```

**RLS** — admin-only:
```sql
alter table public.google_credentials enable row level security;

create policy google_credentials_admin_all on public.google_credentials
  for all using (public.is_admin()) with check (public.is_admin());
```

---

## 5. Functions & Triggers

### 5.1 Auto-create profile on signup
```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
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
```

> The admin is created as a normal user first, then promoted: `update profiles set role = 'admin' where auth_user_id = <admin-id>;` (server-side).

### 5.2 Keep `updated_at` fresh (generic)
```sql
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch   before update on public.profiles  for each row execute function public.touch_updated_at();
create trigger customers_touch  before update on public.customers for each row execute function public.touch_updated_at();
create trigger services_touch   before update on public.services  for each row execute function public.touch_updated_at();
create trigger products_touch   before update on public.products  for each row execute function public.touch_updated_at();
```

### 5.3 Inventory: apply quantity change + record sales
```sql
-- Every inventory_transactions insert updates the cached quantity_on_hand.
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

-- A sale_item auto-creates a 'sale' inventory transaction (decrements stock).
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
```

> **Note:** `apply_inventory_txn` runs in the same transaction, so a sale that would drive stock negative fails with the `products.quantity_on_hand >= 0` check — inventory can never go negative.

---

## 6. RLS Policy Summary

| Table | anon | authenticated (customer) | authenticated (admin) | Notes |
|-------|------|--------------------------|------------------------|-------|
| profiles | — | select/update own | full | role not self-editable |
| customers | — | select/update own | full | clinical data is customer-private |
| services | select active | select active | full | no price column |
| service_pricing | — | — | full | **price is admin-only** |
| appointments | — | own | full | — |
| appointment_services | — | own (read) | full | — |
| appointment_notes | — | — | full | treatment log internal |
| products | — | — | full | internal |
| inventory_transactions | — | — | full | immutable log |
| sale_items | — | — | full | internal |
| availability | select | select | full | public slot data |
| blocked_slots | — | — | full | internal |
| settings | select | select | full | non-sensitive keys |
| google_credentials | — | — | full | tokens in Vault |

---

## 7. Double-booking & Integrity Constraints

Primary guard is the **booking RPC** (`create_booking`, advisory lock + overlap check). A database-level **trigger** is the backstop for any insert/update path:

```sql
-- BEFORE INSERT OR UPDATE: serialize + reject overlaps against active appointments.
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
```

> **Why a trigger instead of a GiST exclusion constraint:** a generated-column approach requires an immutable expression, but `tstzrange`/`make_interval` are not immutable. The trigger (with an advisory lock) provides the same serialized, concurrency-safe guarantee.

---

## 8. Indexes

```sql
create index idx_appointments_customer   on public.appointments (customer_id);
create index idx_appointments_start_at   on public.appointments (start_at);
create index idx_appointments_status     on public.appointments (status);
create index idx_appointment_notes_appt  on public.appointment_notes (appointment_id);
create index idx_inventory_txn_product   on public.inventory_transactions (product_id, created_at);
create index idx_sale_items_appt         on public.sale_items (appointment_id);
create index idx_sale_items_product      on public.sale_items (product_id);
create index idx_customers_profile       on public.customers (profile_id);
create index idx_customers_clinical      on public.customers using gin (clinical);
```

---

## 9. Reporting Views (earnings)

```sql
-- Service revenue (completed appointments)
create or replace view public.v_service_revenue as
select
  a.id as appointment_id,
  a.start_at,
  sum(coalesce(aps.price_at_booking, 0)) as service_revenue
from public.appointments a
left join public.appointment_services aps on aps.appointment_id = a.id
where a.status = 'completed'
group by a.id, a.start_at;

-- Product sales with profit
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
```

> Earnings for a date range = `sum(v_service_revenue.service_revenue)` + `sum(v_product_sales.profit_total)` (join on `appointment_id`). The admin dashboard consumes these views.

---

## 10. Security Notes

1. **Google OAuth tokens** are stored in **Supabase Vault** (encrypted with `pgsodium`); `google_credentials.vault_ref` points to them. Never store tokens in plain columns.
2. **`service_role`** key is used only in Edge Functions (calendar sync, notifications, admin promotion). Never in the browser.
3. **Prices** are structurally hidden from non-admins via the `service_pricing` split.
4. **Clinical/medical data** is row-level restricted to the owning customer + admin; back up PII-aware, and support data-deletion requests (cascade from `profiles` → `customers` → `appointments`).
5. **No negative stock** is enforced by the `quantity_on_hand >= 0` check + transaction trigger.

---

## 11. Notes / Open Items

- The `clinical` JSONB is chosen for flexibility (the Ficha Clínica may evolve). If strict typing/auditing is later required, promote fields to columns or a `customer_answers` table.
- `appointment_services` supports multi-service appointments; the common case is one service.
- Cancel/reschedule policy (24h) is enforced in the booking Edge Function, not the DB.
- Google Calendar write is idempotent via `appointments.google_event_id` (unique).

---

*This spec is a living reference — pair it with `PROJECT_ROADMAP.md`. Next: wireframes (§15 of the roadmap).*
