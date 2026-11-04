-- 0008_fix_record_sale_created_by.sql
-- Corrige: created_by debe ser profiles.id (no el auth user id).

create or replace function public.record_sale()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.inventory_transactions
    (product_id, type, quantity_delta, reason, appointment_id, created_by)
  values
    (new.product_id, 'sale', -new.quantity, 'Venta registrada', new.appointment_id,
     (select p.id from public.profiles p where p.auth_user_id = auth.uid() limit 1));

  return new;
end;
$$;
