-- 0003_availability_and_slots.sql
-- Horario inicial + RPC de slots visible para anónimos.

-- 1. Horario semanal (Lun–Vie 9–18, Sáb 9–14, Dom cerrado)
insert into public.availability (day_of_week, start_time, end_time, buffer_minutes, is_off)
values
  (1, '09:00', '18:00', 10, false),
  (2, '09:00', '18:00', 10, false),
  (3, '09:00', '18:00', 10, false),
  (4, '09:00', '18:00', 10, false),
  (5, '09:00', '18:00', 10, false),
  (6, '09:00', '14:00', 10, false),
  (7, '09:00', '14:00', 10, true)
on conflict (day_of_week) do nothing;

-- 2. El cálculo de slots debe leer las citas ocupadas aunque el visitante
--    sea anónimo. Al ser SECURITY DEFINER solo devuelve horas, sin datos.
alter function public.get_available_slots(uuid, date, text) security definer;
