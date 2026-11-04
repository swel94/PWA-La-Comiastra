-- 0002_services_images.sql
-- Imágenes de servicios + almacenamiento + datos iniciales.

-- 1. Columna de imagen en services
alter table public.services
  add column if not exists image_url text;

-- 2. Bucket público para imágenes de servicios
insert into storage.buckets (id, name, public)
values ('service-images', 'service-images', true)
on conflict (id) do nothing;

-- 3. Solo el admin puede subir / modificar / borrar imágenes
drop policy if exists "service_images_admin_write" on storage.objects;
create policy "service_images_admin_write"
on storage.objects
for all
to authenticated
using (bucket_id = 'service-images' and public.is_admin())
with check (bucket_id = 'service-images' and public.is_admin());

-- 4. Semilla de servicios (solo si la tabla está vacía)
insert into public.services (name, description, duration_minutes, category, is_active)
select name, description, duration_minutes, category, is_active
from (
  values
    ('Limpieza facial', 'Higiene profunda, extracción de impurezas y mascarilla calmante.', 60, 'Facial', true),
    ('Facial anti-acné', 'Tratamiento específico para piel con acné, brotes y congestión.', 45, 'Facial', true),
    ('Dermaplaning', 'Exfoliación y renovación de la superficie para un acabado luminoso.', 30, 'Facial', true),
    ('Tratamiento de manchas', 'Atenúa manchas y unifica el tono de forma progresiva y segura.', 60, 'Facial', true)
) as v(name, description, duration_minutes, category, is_active)
where not exists (select 1 from public.services);

-- 5. Precio interno inicial (0) para servicios sin precio
insert into public.service_pricing (service_id, internal_price)
select s.id, 0
from public.services s
where not exists (
  select 1 from public.service_pricing p where p.service_id = s.id
);
