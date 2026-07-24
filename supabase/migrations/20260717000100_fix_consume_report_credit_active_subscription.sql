begin;

create or replace function public.consume_report_credit(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscription record;
begin
  if p_user_id is null then
    return false;
  end if;

  select s.id, s.report_quota, s.reports_used, s.lifetime_access
    into v_subscription
  from public.subscriptions s
  where s.user_id = p_user_id
    and lower(coalesce(s.status, '')) in ('active', 'trialing')
    and (
      coalesce(s.lifetime_access, false) = true
      or s.current_period_end is null
      or s.current_period_end >= now()
    )
  order by s.updated_at desc nulls last, s.current_period_end desc nulls last
  limit 1
  for update;

  if not found then
    return false;
  end if;

  if coalesce(v_subscription.lifetime_access, false) = true then
    return true;
  end if;

  if coalesce(v_subscription.report_quota, 0) <= coalesce(v_subscription.reports_used, 0) then
    return false;
  end if;

  update public.subscriptions
    set reports_used = coalesce(reports_used, 0) + 1,
        updated_at = now()
  where id = v_subscription.id;

  return true;
end;
$$;

grant execute on function public.consume_report_credit(uuid) to authenticated;

commit;
