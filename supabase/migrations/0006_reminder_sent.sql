-- 0006_appointment_reminder.sql
-- Marca de recordatorio enviado (WhatsApp manual).

alter table public.appointments
  add column if not exists reminder_sent_at timestamptz;
