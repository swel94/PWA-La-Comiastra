-- 0011_customer_exists.sql
-- Permite verificar (solo boolean) si un correo ya tiene ficha de cliente.

create or replace function public.customer_exists_for_email(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.customers c on c.profile_id = p.id
    where lower(p.email) = lower(trim(p_email))
  );
$$;

grant execute on function public.customer_exists_for_email(text) to anon, authenticated;
