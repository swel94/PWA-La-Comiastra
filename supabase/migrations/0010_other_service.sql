-- 0010_other_service.sql
-- Opción "Otro / Consulta" para clientes cuya necesidad no encaja en un servicio existente.

insert into public.services (name, description, duration_minutes, category, is_active)
select
  'Otro / Consulta',
  'Si ninguna opción se ajusta a tu necesidad, reserva esta consulta y conversamos sobre lo que tu piel necesita.',
  30,
  'Consulta',
  true
where not exists (
  select 1 from public.services where name = 'Otro / Consulta'
);

insert into public.service_pricing (service_id, internal_price)
select id, 0
from public.services
where name = 'Otro / Consulta'
on conflict (service_id) do nothing;
