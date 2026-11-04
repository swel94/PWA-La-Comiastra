# Esthetician PWA — Project Roadmap

> **Status:** Draft v0.1 — foundations only, no code yet.
> **Purpose:** Single source of truth for the product so both the owner and the developer understand the full scope, data model, architecture, and build order.
> **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions + Realtime).

---

## 1. Executive Summary

A progressive web app (PWA) for a **single esthetician** that:

- Presents a **public landing page** (bio, services overview — no prices).
- Lets visitors **book appointments** that sync to the esthetician's **Google Calendar**.
- Captures **first-time visitor intake** into a full **customer profile** (editable by the esthetician).
- Records **treatment history and notes** per appointment.
- Maintains an **inventory** of retail products (cost vs. selling price, quantity, profit).
- Tracks **products sold during each appointment** (not a full POS) and **service revenue**, producing **earnings reports**.

The esthetician is the sole **admin**; customers are self-service users. There is no multi-staff scheduling in v1.

---

## 2. Goals & Success Criteria

### Goals
| # | Goal |
|---|------|
| G1 | Visitors can learn about the esthetician without seeing prices. |
| G2 | Visitors can self-book appointments that appear on the esthetician's Google Calendar. |
| G3 | First-time visitors are converted into complete, editable customer profiles. |
| G4 | The esthetician can keep a per-appointment treatment record with notes. |
| G5 | Inventory stays accurate: quantity, cost, sell price, and profit are visible. |
| G6 | Products sold per appointment decrement inventory and feed earnings. |
| G7 | Services + internal prices are managed and feed earnings. |
| G8 | Earnings are reportable (services + product profit) without a POS. |

### Success Criteria (measurable)
- Booking a slot never double-books and always creates a Google Calendar event within ~seconds.
- Every appointment has a customer record; no orphan bookings.
- Inventory quantity never silently drifts (every change has a traceable transaction).
- Admin can see, for any date range, total service revenue and product profit.

---

## 3. Users & Roles

| Role | Description | Capabilities |
|------|-------------|--------------|
| **Anonymous visitor** | Anyone on the public site | View landing page; begin booking; create account during intake |
| **Customer** | Authenticated user who has booked | View/edit own profile; view/manage own appointments |
| **Admin (esthetician)** | The business owner | Everything: customers, services, appointments, notes, inventory, sales, earnings, settings |

> **Note:** "Admin" = the esthetician. There is exactly one admin in v1. Role is enforced via Supabase Auth + a role field on the profile + Row Level Security (RLS).

---

## 4. Scope

### In scope (v1)
- Public landing page (bio, about, services overview — **no prices**).
- Self-service appointment booking with Google Calendar sync.
- Customer intake form → customer profile.
- Admin customer management (view/edit/archive).
- Appointment management + per-appointment treatment notes.
- Product inventory with cost/sell/profit and quantity tracking.
- Per-appointment product sales (inventory decrement + earnings).
- Services catalog with internal prices.
- Earnings reporting (basic).

### Out of scope (v1 — revisit later)
- Full POS / payment processing / receipts / invoices.
- Multi-staff or multiple calendars.
- Online payments, deposits, or cancellation fees.
- Marketing (email campaigns, reviews, gift cards).
- Multi-location or franchises.
- Time-off / payroll.
- SMS/WhatsApp integration (email only, unless later needed).

---

## 5. Feature Catalog

### 5.1 Public Landing Page
- **Branding (demo):** "La Cosmiatra" — palette: Camel `#bb9457`, Light Apricot `#ffe6a7`, Chocolate Brown `#99582a`, Dark Coffee `#432818`. Placeholder until final branding is provided.
- Hero / about section (who the esthetician is).
- Services overview: name + short description + duration (**no prices**).
- Contact / location / hours.
- "Book an appointment" CTA.
- PWA: installable, works on mobile.

**User story:** *As a visitor, I can learn about the esthetician and see what services are offered, without seeing prices.*

### 5.2 Appointment Scheduling (self-service)
- Select a **service** → see available **time slots** based on configured working hours and service duration.
- Select date/time → confirm.
- **First-time visitor**: is prompted to create an account + fill intake form before the booking is finalized.
- **Returning customer**: logs in, booking pre-populates from profile.
- Booking creates an appointment record + a **Google Calendar event**.
- Customer can cancel/reschedule up to **24h before** (admin can always override).
- Prevent double-booking; support buffer time between appointments.

**User story:** *As a visitor, I can book an available time slot; if I'm new, I fill in my details, and the appointment appears on the esthetician's calendar.*

### 5.3 Customer Intake & Profile
Intake fields (from the "Ficha Clínica" Google Form — 23 questions):

**Contact & personal:**
- Correo electrónico (email) — required
- Nombre completo (full name)
- Edad (age)
- Sexo — Hombre / Mujer
- Ocupación (occupation)
- Teléfono celular (cell phone)

**Motivo de visita (reason for visit — multi-select):**
- Acné, Rosácea, Manchas, Arrugas, Blanqueamiento Corporal, Mantenimiento, Otros

**Datos Clínicos (clinical history):**
- ¿Ha estado en algún tratamiento dermatológico anteriormente? (No / Otros → explain)
- ¿Tienes algún tratamiento dermatológico en curso? (No / Otros → explain)
- ¿Padece de alguna de las siguientes condiciones? (Tiroides, Ovarios poliquísticos, Diabetes, Presión arterial, Dermatitis atópica, Asma, Cáncer, Rinitis alérgica, Otros)
- ¿Se ha sometido a cirugía o procedimiento estético recientemente? (No / Otros → explain)
- ¿Conoce sus niveles tiroideos? (Menor a 20 / Entre 20–50 / De 50–100 / Mayor a 100 ng/ml / Desconozco)
- ¿Conoce sus niveles de vitamina D? (Sí / No / N/A)
- ¿Está tomando algún medicamento actualmente (incluye anticonceptivos o vitaminas)? (Sí → explain / No / N/A)
- ¿Está actualmente lactando? (Sí / No)
- ¿Está embarazada? (Sí / No / N/A)
- ¿Tiene alguna prótesis dental? (Sí / No)
- ¿Es su periodo regular? (Sí / No / N/A)
- ¿Consume alcohol regularmente? (Sí / No)
- ¿Presenta algún tipo de alergia? (Sí → explain)
- ¿Puede tomar Aspirina, diclofenac o Ibuprofeno? (Sí / No)
- ¿Tiene alguna rutina facial? (Otros → explain)
- ¿Se ha realizado algún tratamiento facial con un profesional anteriormente? (Sí / No)

**Consent (recommended addition):** waiver / consent acknowledgement checkbox.

**User story:** *As a first-time customer, I provide my details once and a full profile is created. As the esthetician, I can update that profile when information changes.*

### 5.4 Admin Dashboard
- Today's appointments + upcoming.
- Quick stats: appointments, customers, revenue, low-stock products.
- Navigation to all admin modules.

### 5.5 Appointment Management & Treatment Notes
- List/calendar view of appointments; filter by customer/status/date.
- Appointment detail: customer, service(s), time, status.
- **Treatment notes**: timestamped comments the esthetician adds before/during/after the appointment.
- Optionally link products used/sold and record service actually performed.
- Appointment statuses: `pending`, `confirmed`, `completed`, `cancelled`, `no-show`.

**User story:** *As the esthetician, I can open an appointment, write treatment notes/comments, and revisit that history later.*

### 5.6 Product Inventory
- Add products: name, SKU (optional), category, supplier (optional), unit, quantity on hand.
- **Cost price** and **selling price**; computed **profit** (sell − cost) and **margin %**.
- Add / remove / adjust quantity (with reason).
- Low-stock threshold + alert.
- Full audit trail of every quantity change (who/when/why).

**User story:** *As the esthetician, I add products with cost and sell price, see profit immediately, and adjust quantities with a traceable history.*

### 5.7 Per-Appointment Sales (not a POS)
- On an appointment, list products **sold** to that customer.
- Each sale line: product, quantity, price at time of sale.
- Selling a product **decrements inventory** automatically.
- Sale is linked to the appointment so it contributes to that appointment's earnings and to reports.

**User story:** *As the esthetician, I record which products a customer bought during their visit; inventory updates and the sale counts toward earnings.*

### 5.8 Services Catalog & Earnings
- Add/edit services: name, description, duration, **internal price**, category, active/inactive.
- Service revenue counted when an appointment is marked `completed`.
- Earnings report = **service revenue** + **product profit** (sell − cost) over a date range.

**User story:** *As the esthetician, I manage my services and prices internally and see my earnings over time.*

### 5.9 Google Calendar Integration
- **Status: DEFERRED for v1 (optional).** The in-app **Admin → Citas** calendar is the source of truth; Google sync adds OAuth/verification complexity without being strictly necessary.
- If revisited: OAuth to the esthetician's Google Calendar; create/update/delete events; one-way (app → Google).
- Low-effort alternative: **ICS feed** (read-only subscription URL) so she can see appointments in her phone's calendar without OAuth.

### 5.10 Authentication & Roles
- Supabase Auth (email/password, possibly OTP/Google sign-in for customers).
- Public browsing without login; login required to finalize booking.
- Admin role enforced by RLS + a `role` field on profile.

### 5.11 Notifications (proposed)
- Confirmation/reminder emails to customer and admin.
- Optional PWA push notifications for reminders.
- Notification on booking created / rescheduled / cancelled.

### 5.12 PWA / Offline
- Web app manifest + service worker.
- Installable to home screen; offline shell (cached UI).
- Data requires network (Supabase); offline write support is **out of scope** v1 unless requested.

### 5.13 Customer Identification (New vs. Returning)
**Identity anchor:** email (only). Phone-based duplicate detection is **out of scope for v1** (revisit only if duplicate profiles actually occur).

**How a recurring customer books again:**
1. Visitor selects a service and an available time slot on the landing page.
2. At the "confirm" step the app checks for an active session (`auth.getSession()`).
   - **Session exists** → the customer is already known → profile loads and the booking is **pre-filled** (name, contact) → they review and confirm. No intake form.
3. If no session, show a single **"What's your email?"** step:
   - **Account exists** → returning → sign in (magic link / password) → pre-fill → confirm.
   - **No account** → **new** customer → create account + show the intake form → confirm.

**New vs. returning rule:**
| Situation | Verdict | Result |
|-----------|---------|--------|
| Active session on device | Returning | Pre-fill, skip intake |
| Email found in `profiles`/`customers` | Returning | Sign in, skip intake |
| Email not found | New | Account creation + intake |

**Notes:**
- Returning customers never re-enter their intake details; they can still edit them from their profile.
- Once signed in on a device, the session persists, so subsequent visits are recognized automatically.
- Optional: Google/SMS OTP as an alternative to email magic link (same new-vs-returning logic applies).

---

## 6. Key User Flows

1. **First-time booking**
   Landing → choose service → choose slot → enter email → email not found → create account → intake form → confirm → appointment created + calendar event + confirmation email.

2. **Returning booking (session active)**
   Landing → choose service → choose slot → session recognized → profile pre-filled → confirm → appointment + calendar event.

3. **Returning booking (signed out / new device)**
   Landing → choose service → choose slot → enter email → email found → sign in (magic link or password) → profile pre-filled → confirm → appointment + calendar event.

4. **Admin completes an appointment**
   Dashboard → open appointment → add treatment notes → mark service(s) performed → add products sold → mark `completed` → inventory decrements + earnings recorded.

5. **Inventory adjustment**
   Inventory → open product → add/remove quantity with reason → transaction recorded → quantity + profit update.

6. **Earnings review**
   Reports → select date range → view service revenue, product profit, totals.

---

## 7. Data Model (Logical)

> Field-level detail to be finalized in the schema spec. This is the logical shape.

```
profiles               (auth users: customers + admin)
  id, auth_user_id, role (customer|admin), full_name, email, phone, avatar_url, created_at

customers
  id, profile_id, first_name, last_name, phone, email, dob,
  skin_type, concerns, allergies, medical_conditions, routine, consent, notes,
  created_at, updated_at

services
  id, name, description, duration_minutes, internal_price, category,
  is_active, created_at

appointments
  id, customer_id, status, start_at, end_at, google_event_id,
  buffer_before_min, buffer_after_min, notes_summary,
  created_at, updated_at

appointment_services      (junction — supports multiple services per appointment)
  id, appointment_id, service_id, price_at_booking

appointment_notes         (treatment log — multiple, timestamped comments)
  id, appointment_id, author_id, content, created_at

products
  id, name, sku, category, supplier, unit, cost_price, sell_price,
  quantity_on_hand, low_stock_threshold, is_active, created_at, updated_at

inventory_transactions    (audit trail)
  id, product_id, type (in|out|adjustment|sale), quantity_delta,
  reason, appointment_id (nullable), created_by, created_at

sale_items                (products sold at an appointment)
  id, appointment_id, product_id, quantity, sell_price_at_sale,
  cost_at_sale, created_at

availability              (working hours / schedule rules)
  id, day_of_week, start_time, end_time, buffer_minutes, is_off (blocked day)

settings                 (business config: name, timezone, currency, policies)
  id, key, value

google_credentials       (securely stored OAuth tokens — see §8.3)
  id, profile_id, access_token_encrypted, refresh_token_encrypted, expires_at
```

**Relationships at a glance:**
- `customers` 1—N `appointments` 1—N `appointment_notes`, `appointment_services`, `sale_items`.
- `products` 1—N `inventory_transactions`, `sale_items`.
- `services` 1—N `appointment_services`.

---

## 8. Supabase Architecture

### 8.1 Database & RLS
- Postgres schema with the tables above.
- **RLS** on every table:
  - Customers: can read/update **own** rows only.
  - Admin: full access.
  - Public/anonymous: read only public-safe fields (services overview, availability).
- `role` lives on `profiles`; helper `is_admin()` function used in policies.

### 8.2 Auth
- Supabase Auth for customers via **email OTP / magic link** (no passwords).
- Admin account created once and assigned `role = admin`.

### 8.3 Google Calendar Integration
- **OAuth 2.0** authorization code flow scoped to the esthetician's **personal** Google Calendar.
- Tokens stored **encrypted** (Supabase Vault / `pgsodium`), never plaintext.
- An **Edge Function** (or the app with a service token) performs create/update/delete on calendar events.
- Concurrency/idempotency: store `google_event_id` on the appointment; update events idempotently; handle the case where the user manually edits/deletes the event in Google.
- Availability source of truth: **app DB** (working hours + existing appointments). Optionally read Google free/busy for two-way sync (decision in §14).

### 8.4 Edge Functions
Candidates:
- `google-calendar` — OAuth callback + token refresh + event sync.
- `notifications` — send confirmation/reminder emails (via a mail provider).
- `availability` — compute open slots given hours, service duration, and existing bookings.
- `checkout-booking` (optional) — atomic booking to prevent race conditions/double-booking.

### 8.5 Storage
- Customer avatars (optional).
- Business/landing images.

### 8.6 Realtime (optional, nice-to-have)
- Live updates to admin dashboard when a new booking arrives.

---

## 9. Tech Stack (proposed)

| Layer | Choice |
|-------|--------|
| Frontend | React + Vite (or Next.js) — PWA-friendly SPA |
| Language | TypeScript |
| Styling | Tailwind CSS (+ a small component kit) |
| Backend/BaaS | **Supabase** (Postgres, Auth, Storage, Edge Functions, Realtime) |
| PWA | `vite-plugin-pwa` / Workbox (manifest + service worker) |
| State/data | Supabase JS client; TanStack Query for server state |
| Forms | React Hook Form + Zod validation |
| Emails | Resend / Postmark / SendGrid via Edge Function |
| Hosting | Vercel / Netlify / Cloudflare Pages (static SPA) |
| Secrets | Supabase Vault |

---

## 10. Build Order (Milestones / Phases)

| Phase | Deliverable | Depends on |
|-------|-------------|-----------|
| **P0 — Foundation** | Supabase project, repo, CI, PWA scaffold, design system, environment config | — |
| **P1 — Auth & Roles** | Supabase Auth, profile roles, RLS policies, admin vs customer access | P0 |
| **P2 — Landing Page** | Public landing (bio, services overview, no prices), installable PWA shell | P0, P1 |
| **P3 — Services & Customers** | Services catalog (internal prices), intake form, customer profile, admin customer management | P1 |
| **P4 — Scheduling + Google Sync** | Availability config, slot picker, booking flow, OAuth + calendar create/update/delete | P3 |
| **P5 — Appointments & Notes** | Admin appointment management, statuses, treatment notes/comments | P4 |
| **P6 — Inventory & Sales** | Products (cost/sell/profit), inventory transactions, per-appointment sales + decrement | P3, P5 |
| **P7 — Earnings & Reports** | Service revenue + product profit reporting over date ranges | P6 |
| **P8 — Notifications & PWA Polish** | Confirmation/reminder emails, push (optional), offline shell, performance, accessibility | P4 |
| **P9 — QA & Launch** | Testing (unit/E2E), data backup, monitoring, production deploy | All |

**Suggested sequencing rationale:** Google Calendar sync (P4) is the riskiest integration, so it's placed early enough to de-risk, right after the data foundations (customers + services) exist. Inventory/earnings build on appointments, so they come after.

---

## 11. Non-Functional Requirements

- **Security:** RLS on all tables; encrypted OAuth tokens; least-privilege roles; no prices exposed publicly.
- **Privacy:** customer medical/skin data is sensitive — restrict access, back up securely, plan for data-deletion requests.
- **Performance:** landing + booking flow responsive on mobile; fast time-to-interactive.
- **Reliability:** booking must not double-book; calendar sync failures must be retried and surfaced to the admin.
- **Auditability:** inventory changes and earnings are traceable.
- **Accessibility:** readable contrast, keyboard navigation, semantic HTML.
- **Maintainability:** TypeScript, typed schema, documented RLS policies.

---

## 12. Assumptions (to confirm)

1. Single esthetician / single admin; one Google Calendar account (the esthetician's **personal** account).
2. Currency is a single fixed currency: **Dominican pesos (DOP)**.
3. No online payments in v1; earnings are internal bookkeeping only.
4. Service duration drives slot length; appointments are single-service in the common case (multi-service supported but optional).
5. Customer data is modest scale (single practitioner) — no sharding/complex scaling needed.
6. Email is the primary notification channel; push/SMS optional.

---

## 13. Open Questions / Decisions Needed

> All initial open questions (Q1–Q12) have been resolved and are recorded in the Decisions Log. New decisions will be added here as they arise.

---

## Decisions Log

> Confirmed decisions are recorded here so they stop being open questions.

| ID | Decision | Resolution |
|----|----------|------------|
| D1 | Phone-based duplicate detection | **Skipped for v1.** Identify customers by email only; revisit only if duplicates occur. |
| Q1 | Google account | Esthetician's **personal** Google account. |
| Q2 | Calendar sync direction | **One-way** (app → Google). |
| Q3 | Booking confirmation | **Auto-confirm** (instant booking); admin can override. |
| Q4 | Currency | **Dominican pesos (DOP)**. |
| Q5 | Customer sign-in | **Email OTP / magic link** (no passwords). |
| Q6 | Cancel/reschedule window | Customer can cancel/reschedule up to **24h before**; admin can always override. |
| Q7 | Intake fields | Full **"Ficha Clínica"** form captured (23 questions) — see §5.3. |
| Q8 | Consumables tracking | **Only "sold" products decrement inventory** in v1; "used during treatment" via manual adjustment later. |
| Q9 | Notifications | **Email only** (confirmation + reminder). |
| Q10 | Branding | **"La Cosmiatra"** — palette: Camel `#bb9457`, Light Apricot `#ffe6a7`, Chocolate Brown `#99582a`, Dark Coffee `#432818`. Demo only; final branding later. |
| Q11 | Slot granularity | **Dynamic** — computed from service duration + working hours + buffer. |
| Q12 | Data security | **As secure as possible**: all customer data treated as sensitive; RLS everywhere, encrypted OAuth tokens, HTTPS, minimal data, secure backups. |
| D2 | UI language | **Spanish (es) by default.** All visible copy, labels, and notifications are in Spanish. |
| D3 | Google Calendar sync | **Deferred for v1.** The in-app Citas calendar is the source of truth. Optional ICS feed later. |

---

## 14. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Double-booking race condition | High | Atomic booking via Edge Function / DB constraint; idempotent calendar writes |
| Google OAuth token expiry/revocation | Medium | Encrypted refresh tokens, refresh on schedule, notify admin on failure |
| Price leakage on landing page | Medium | RLS + API shape exposes only non-price fields publicly |
| Inventory drift | Medium | All changes via `inventory_transactions`; never direct quantity edits |
| Sensitive customer data exposure | High | Strict RLS, encrypted tokens, secure backups, minimal fields |
| Scope creep (POS, payments) | Medium | Explicit out-of-scope list (§4); revisit after v1 |

---

## 15. Next Steps

1. ~~Produce a detailed schema spec~~ ✅ — see [SCHEMA_SPEC.md](SCHEMA_SPEC.md).
2. ~~Produce wireframes~~ ✅ — see [WIREFRAMES.md](WIREFRAMES.md) (UI en español).
3. ~~Produce an API/Edge Function spec~~ ✅ — see [API_SPEC.md](API_SPEC.md).
4. ~~P0: Supabase migration + PWA scaffold~~ ✅ — see [README.md](README.md), `supabase/migrations/0001_initial_schema.sql`, `app/`.

**Siguiente (implementación por fases, ver §10):** P1 auth/roles ✅ → P2 landing ✅ → P3 servicios (admin + imágenes) ✅ → P4 reserva ✅ (Google Calendar diferido) → P3.5 clientes + ficha clínica ✅ → P5 citas (calendario admin) ✅ → P6 inventario+ventas → P7 reportes → P8 notificaciones+PWA → P9 QA/lanzamiento.

---

## 16. Pre-deployment checklist

Contenido pendiente (contacto real, servicios y precios finales, imágenes, redes sociales, textos legales) a actualizar antes del lanzamiento — ver [PRE_LAUNCH_CHECKLIST.md](PRE_LAUNCH_CHECKLIST.md). **Recordar revisarlo antes de desplegar.**

---

*This document is a living reference — iterate here before and during development.*
