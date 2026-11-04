-- 0009_reports.sql
-- Reportes de ingresos (servicios + productos) + asegurar vistas con RLS.

alter view public.v_service_revenue set (security_invoker = true);
alter view public.v_product_sales set (security_invoker = true);

create or replace function public.get_earnings(p_from timestamptz, p_to timestamptz)
returns table (
  service_revenue numeric,
  product_revenue numeric,
  product_profit numeric,
  completed_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    coalesce((
      select sum(aps.price_at_booking)
      from public.appointments a
      join public.appointment_services aps on aps.appointment_id = a.id
      where a.status = 'completed' and a.start_at >= p_from and a.start_at < p_to
    ), 0)::numeric as service_revenue,
    coalesce((
      select sum(s.sell_price_at_sale * s.quantity)
      from public.sale_items s
      join public.appointments a on a.id = s.appointment_id
      where a.start_at >= p_from and a.start_at < p_to
    ), 0)::numeric as product_revenue,
    coalesce((
      select sum((s.sell_price_at_sale - s.cost_at_sale) * s.quantity)
      from public.sale_items s
      join public.appointments a on a.id = s.appointment_id
      where a.start_at >= p_from and a.start_at < p_to
    ), 0)::numeric as product_profit,
    (
      select count(*)
      from public.appointments a
      where a.status = 'completed' and a.start_at >= p_from and a.start_at < p_to
    )::bigint as completed_count
$$;

create or replace function public.get_earnings_daily(p_from timestamptz, p_to timestamptz)
returns table (
  day date,
  service_revenue numeric,
  product_revenue numeric,
  product_profit numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with svc as (
    select (a.start_at at time zone 'America/Santo_Domingo')::date as day,
           sum(aps.price_at_booking) as amount
    from public.appointments a
    join public.appointment_services aps on aps.appointment_id = a.id
    where a.status = 'completed' and a.start_at >= p_from and a.start_at < p_to
    group by 1
  ),
  prod as (
    select (a.start_at at time zone 'America/Santo_Domingo')::date as day,
           sum(s.sell_price_at_sale * s.quantity) as revenue,
           sum((s.sell_price_at_sale - s.cost_at_sale) * s.quantity) as profit
    from public.sale_items s
    join public.appointments a on a.id = s.appointment_id
    where a.start_at >= p_from and a.start_at < p_to
    group by 1
  )
  select
    coalesce(svc.day, prod.day) as day,
    coalesce(svc.amount, 0)::numeric as service_revenue,
    coalesce(prod.revenue, 0)::numeric as product_revenue,
    coalesce(prod.profit, 0)::numeric as product_profit
  from svc
  full outer join prod on svc.day = prod.day
  order by 1
$$;
