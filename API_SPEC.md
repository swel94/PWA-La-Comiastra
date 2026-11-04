# API & Edge Functions Spec — La Cosmiatra (Supabase)

> **Status:** Draft v0.1 — Step 4 of the roadmap. Companion to `PROJECT_ROADMAP.md`, `SCHEMA_SPEC.md`, `WIREFRAMES.md`.
> **Idioma:** Mensajes de error y correos en **español**.

This defines the server-side surface: Postgres RPC functions (the atomic core) and Edge Functions (calendar sync + notifications), plus the webhook wiring that connects them.

---

## 1. Architecture Overview

```
                         ┌──────────────────────────────┐
  PWA (cliente/admin) ──►│  Supabase Postgres + RLS      │
                         │  · get_available_slots() RPC  │
                         │  · create_booking() RPC       │
                         │  · cancel_booking() RPC       │
                         └───────────┬──────────────────┘
                                     │ triggers / webhooks (pg_net)
                     ┌───────────────┼───────────────┐
                     ▼               ▼               ▼
             ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
             │ calendar-   │ │ notify      │ │ (pg_cron)   │
             │ sync        │ │ (email)     │ │ reminder    │
             │ Edge Fn     │ │ Edge Fn     │ │ schedule    │
             └──────┬──────┘ └─────────────┘ └─────────────┘
                    ▼
            Google Calendar API  +  Resend (email)
```

**Key principle:** the **database is the source of truth**. The atomic booking is a Postgres function; Edge Functions react to DB changes asynchronously and are **idempotent** and **retryable**.

---

## 2. Auth & Roles (recap)

| Role | JWT / key | Use |
|------|-----------|-----|
| `anon` | publishable key | read public data, `get_available_slots` |
| `authenticated` (customer) | user JWT | `create_booking`, `cancel_booking`, own data |
| `authenticated` (admin) | user JWT | everything (RLS checks `is_admin()`) |
| `service_role` | secret key (server only) | Edge Functions: calendar sync, notify, admin ops |

Edge Functions authenticate webhook calls by requiring a shared secret header (`x-webhook-secret`) and/or validating the caller is `service_role`.

---

## 3. Postgres RPC Functions (atomic core)

All are called via `supabase.rpc(...)`. They are `security definer` where they need to touch admin-only tables.

### 3.1 `get_available_slots(p_service_id, p_day, p_tz)` — public

Returns candidate start times for a service on a given day, excluding occupied/blocked time.

```sql
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
            && a.slot_tsrange
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
```

**Response:** `[{ slot_start: "2026-11-10T13:00:00Z", slot_end: "2026-11-10T14:00:00Z" }, …]`

---

### 3.2 `create_booking(p_service_ids, p_start_at)` — authenticated

Atomic booking: validates, serializes with an advisory lock, inserts the appointment + services, returns the appointment id.

```sql
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

  -- single esthetician = single resource → one global advisory lock
  perform pg_advisory_xact_lock(hashtext('la_cosmiatra_booking'));

  if exists (
    select 1 from public.appointments a
    where a.status not in ('cancelled','no_show')
      and tstzrange(p_start_at, v_end_at, '[)') && a.slot_tsrange
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
```

**Request:** `{ p_service_ids: [uuid], p_start_at: "2026-11-10T13:00:00Z" }`
**Response:** `appointment_id` (uuid). On conflict → error `P0001` with Spanish message.

---

### 3.3 `cancel_booking(p_appointment_id, p_reason)` — customer/admin

```sql
create or replace function public.cancel_booking(
  p_appointment_id uuid,
  p_reason text default null
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  -- enforce 24h cancel window for customers (admin always overrides)
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
```

### 3.4 `reschedule_booking(p_appointment_id, p_new_start_at)` — customer/admin

- Validates the 24h window (same rule as cancel).
- Atomic: takes the advisory lock, checks the new slot is free, updates `start_at`/`end_at` (keeping the same `appointment_services`).
- On success the `appointment_after_update` webhook re-syncs the Google event.

---

## 4. Edge Functions

Deployed as Supabase Edge Functions (Deno/TypeScript). All responses are JSON; errors use `{ error: { code, message } }`.

### 4.1 `calendar-sync` — Google Calendar OAuth + event sync

**Routes:**

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/authorize` | admin session | Return Google OAuth consent URL |
| GET | `/callback` | public (state check) | Exchange code → store tokens in Vault |
| POST | `/sync-event` | `x-webhook-secret` | Create/update/delete calendar event for an appointment |
| POST | `/refresh` | `x-webhook-secret` | Force token refresh (diagnostic) |

**`GET /authorize`**
```json
{ "url": "https://accounts.google.com/o/oauth2/v2/auth?...&scope=calendar.events&state=…" }
```
- Scopes: `https://www.googleapis.com/auth/calendar.events` (least privilege) + `openid email`.
- `state` is a signed nonce to prevent CSRF.

**`GET /callback?code=…&state=…`**
1. Validate `state`.
2. Exchange `code` for access + refresh tokens.
3. Store both in **Supabase Vault** (encrypted).
4. Upsert `google_credentials` (profile_id, calendar_id = `"primary"` or the user's email, vault_ref, expires_at).
5. Redirect the admin back to `/ajustes?calendar=ok`.

**`POST /sync-event`** — payload:
```json
{ "appointment_id": "…", "action": "create|update|delete" }
```
Logic:
1. Load the appointment + customer + services (via `service_role`).
2. Refresh the token if expired (using the refresh token in Vault).
3. **create** → `POST /calendars/primary/events` with:
   - `summary`: `"Limpieza facial — María García"`
   - `start/end`: appointment times (timezone aware)
   - `description`: customer phone, service(s)
   - `reminders`: per settings
   → write the returned `id` into `appointments.google_event_id`.
4. **update** → `PATCH /events/{google_event_id}` (if `google_event_id` set) else create.
5. **delete** → `DELETE /events/{google_event_id}` (on cancel).

**Idempotency:** if `google_event_id` already set and `action=create`, skip (already synced). If the event was deleted in Google (404 on update), recreate and overwrite the id.

---

### 4.2 `notify` — email (Resend)

**`POST /`** — payload:
```json
{ "type": "confirmation|cancellation|reminder", "appointment_id": "…" }
```
- Loads customer email, service, date/time via `service_role`.
- Sends via Resend with Spanish templates.

| type | To | Subject (es) |
|------|----|--------------|
| confirmation | cliente + admin | `Tu cita está confirmada — La Cosmiatra` |
| cancellation | cliente + admin | `Tu cita ha sido cancelada` |
| reminder | cliente | `Recordatorio: tu cita de mañana` |

**Email body (cliente, confirmación):**
```
Hola [nombre],

Tu cita está confirmada:
· Servicio: [servicio]
· Fecha: [fecha]
· Hora: [hora]

Si necesitas cambiarla, hazlo hasta 24 h antes.

La Cosmiatra
```

---

## 5. Webhook / Trigger Wiring (DB → Edge Functions)

```sql
-- after an appointment is created: sync calendar + send confirmation
create or replace function public.on_appointment_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url     := current_setting('app.calendar_sync_url', true),
    headers := jsonb_build_object('Content-Type','application/json','x-webhook-secret', current_setting('app.webhook_secret', true)),
    body    := jsonb_build_object('appointment_id', new.id, 'action', 'create')
  );
  perform net.http_post(
    url     := current_setting('app.notify_url', true),
    headers := jsonb_build_object('Content-Type','application/json','x-webhook-secret', current_setting('app.webhook_secret', true)),
    body    := jsonb_build_object('type', 'confirmation', 'appointment_id', new.id)
  );
  return new;
end;
$$;

create trigger appointment_after_insert
  after insert on public.appointments
  for each row execute function public.on_appointment_created();
```

```sql
-- status change → sync calendar (update/delete) + notify on cancel
create or replace function public.on_appointment_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    perform net.http_post(
      url     := current_setting('app.calendar_sync_url', true),
      headers := jsonb_build_object('Content-Type','application/json','x-webhook-secret', current_setting('app.webhook_secret', true)),
      body    := jsonb_build_object(
        'appointment_id', new.id,
        'action', case when new.status = 'cancelled' then 'delete' else 'update' end)
    );

    if new.status = 'cancelled' then
      perform net.http_post(
        url     := current_setting('app.notify_url', true),
        headers := jsonb_build_object('Content-Type','application/json','x-webhook-secret', current_setting('app.webhook_secret', true)),
        body    := jsonb_build_object('type', 'cancellation', 'appointment_id', new.id)
      );
    end if;
  end if;
  return new;
end;
$$;

create trigger appointment_after_update
  after update on public.appointments
  for each row execute function public.on_appointment_status_change();
```

**Reminders (scheduled):** a `pg_cron` job runs hourly:
```sql
select cron.schedule(
  'appointment-reminders', '0 * * * *',
  $$ select net.http_post(…) from appointments
     where status = 'confirmed'
       and start_at between now() + interval '24 hours' and now() + interval '25 hours'
       and not reminder_sent $$  -- (add `reminder_sent boolean` to appointments)
);
```

> **Alternative:** Supabase Database Webhooks (UI) can replace the `net.http_post` triggers — same payloads, managed retries.

---

## 6. Google Calendar Integration Details

| Item | Value |
|------|-------|
| Scope | `https://www.googleapis.com/auth/calendar.events` |
| Calendar | `primary` (the esthetician's personal account) |
| Token storage | Supabase **Vault** (never in `google_credentials` columns) |
| Refresh | Automatic before each API call when `expires_at` < now + 5 min |
| Event title | `"{servicios} — {nombre cliente}"` |
| Idempotency key | `appointments.google_event_id` (unique) |
| Retry | Webhook retries with backoff; `sync-event` is safe to re-run |

**Token refresh pseudocode:**
```ts
async function getAccessToken(profileId) {
  const creds = await loadFromVault(profileId);
  if (Date.now() < creds.expires_at - 5*60_000) return creds.access_token;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id, client_secret, refresh_token: creds.refresh_token
    })
  });
  const data = await r.json();
  await saveToVault(profileId, { access_token: data.access_token, expires_at: Date.now() + data.expires_in*1000 });
  return data.access_token;
}
```

---

## 7. Error Handling & Idempotency

| Scenario | Behavior |
|----------|----------|
| Double-booking race | `create_booking` advisory lock + `P0001` error → UI shows "El horario ya no está disponible" |
| Google token revoked | `sync-event` returns error; admin notified in Ajustes to reconnect |
| Google event deleted manually | `update` gets 404 → recreate event, overwrite `google_event_id` |
| Email send fails | Resend error logged; webhook retried (no effect on booking) |
| `sync-event` re-run (create) | skipped when `google_event_id` already set |

---

## 8. Security Notes

1. **`service_role`** key used only inside Edge Functions; never shipped to the browser.
2. **Webhook secret** (`x-webhook-secret`) required for `sync-event`/`notify`; set via Edge Function secrets (`supabase secrets set`).
3. **Google tokens** in Vault; OAuth `state` is a signed nonce.
4. **Price** never returned to `anon`/customer — `service_pricing` is admin-only (see schema).
5. **Booking** enforced by `security definer` + advisory lock; customers cannot bypass the 24h cancel rule (enforced in `cancel_booking`).

---

## 9. API Surface Summary

| Call | Trigger | Audience | Effect |
|------|---------|----------|--------|
| `get_available_slots` RPC | user | anon | returns open slots |
| `create_booking` RPC | user | customer | atomic insert → triggers webhooks |
| `cancel_booking` RPC | user | customer/admin | status=cancelled → triggers webhooks |
| `reschedule_booking` RPC | user | customer/admin | moves times → triggers webhooks |
| `calendar-sync /authorize` | admin | admin | start Google OAuth |
| `calendar-sync /callback` | Google redirect | public | store tokens in Vault |
| `calendar-sync /sync-event` | DB webhook | service | create/update/delete event |
| `notify /` | DB webhook / cron | service | send email |

---

## 10. Open Items

- Add `reminder_sent boolean` (default false) to `appointments` for the cron reminder.
- Configure `app.calendar_sync_url`, `app.notify_url`, `app.webhook_secret` as Postgres custom settings or Vault secrets.
- Confirm email provider (Resend assumed).

---

*Próximo paso (§15 del roadmap): configuración del proyecto Supabase + andamiaje PWA (P0).*
