# La Cosmiatra — PWA para esteticista

App para una esteticista: landing pública, reserva de citas, ficha clínica configurable, clientes, inventario, ventas por cita y reportes de ingresos. Backend en **Supabase**.

> Nota: la sincronización con Google Calendar quedó **diferida**; la agenda vive en la app (**Admin → Citas**) y los recordatorios se envían por **WhatsApp manual** (enlaces `wa.me`), más “Añadir a mi calendario” para el cliente.

## Stack

- **Frontend:** React + Vite + TypeScript + React Router, PWA (`vite-plugin-pwa`).
- **Backend:** Supabase (Postgres, Auth, Storage, RLS).
- **UI:** español, paleta Camel `#bb9457` / Apricot `#ffe6a7` / Chocolate `#99582a` / Coffee `#432818`.

## Estructura

```
app/                       PWA (React + Vite + TypeScript)
  src/
    lib/                   tokens, cliente Supabase, helpers (servicios, clientes,
                           productos, reportes, whatsapp, calendario, etc.)
    pages/                 Landing, Reservar, Mis citas, Login
    pages/admin/           Panel, Citas, Clientes, Servicios, Inventario,
                           Reportes, Ficha clínica, Ajustes
    components/            ClinicalForm, MonthGrid
supabase/
  migrations/             0001…0009 (esquema, storage, reportes, fixes)
  functions/              calendar-sync / notify (esqueletos, no usados)
```

## Desarrollo local

```bash
cd app
pnpm install
pnpm dev
```

Creá `app/.env.local` (copiá `app/.env.example`) con:

```
VITE_SUPABASE_URL=https://<proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon / publishable key>
```

Base de datos: aplicá las migraciones de `supabase/migrations` en orden (SQL Editor o `supabase db push`).

## Usuario administrador

El admin es un usuario normal con `profiles.role = 'admin'`. Para promover una cuenta:

```sql
update public.profiles
set role = 'admin'
where auth_user_id = (select id from auth.users where email = 'correo@ejemplo.com');
```

## Deploy (P9)

1. **Build de producción**
   ```bash
   cd app
   pnpm install
   pnpm build
   ```
   Genera `dist/` (incluye `manifest.webmanifest`, `sw.js`, íconos PWA).

2. **Hosting estático** — Vercel, Netlify o Cloudflare Pages.
   - Ya incluye `app/vercel.json` y `app/public/_redirects` para el *fallback* SPA (todas las rutas → `index.html`).
   - En el host, definí las variables de entorno: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

3. **Supabase Auth**
   - En **Authentication → URL Configuration**, poné el **Site URL** con el dominio real.
   - Agregá el dominio a **Redirect URLs**.
   - La PWA requiere **HTTPS** para instalarse y para el service worker.

4. **Secretos** — `service_role` y cualquier clave de Edge Functions van como secrets de Supabase, **nunca** en el frontend.

> En algunos entornos Windows el build puede fallar por permisos sobre la carpeta temporal del sistema; si pasa, apuntá `TEMP`/`TMP` a una carpeta escribible y reintentá.

## Funcionalidad incluida

- **Landing** pública (sin precios) con marca, fotos y servicios.
- **Reserva** en línea: servicio → fecha/hora (calendario, 90 días) → registro → ficha clínica → confirmación.
- **Ficha clínica** configurable por la esteticista (agregar/editar/quitar/reordenar preguntas).
- **Clientes**: perfiles editables, ficha clínica, eliminar.
- **Citas**: calendario semanal, detalle, notas de tratamiento, estado, WhatsApp, eliminar.
- **Servicios** con imagen y precio interno.
- **Inventario**: costo, venta, ganancia, stock, entradas/salidas, SKU automático.
- **Ventas por cita** con descuento automático de inventario.
- **Reportes** de ingresos por servicios y productos (por rango de fechas).

## Pendientes antes del lanzamiento

Ver [`PRE_LAUNCH_CHECKLIST.md`](PRE_LAUNCH_CHECKLIST.md): datos de contacto reales, precios y servicios finales, imágenes, redes y textos legales. También: reactivar la confirmación de email / configurar SMTP, y actualizar el **Site URL** de Auth.
