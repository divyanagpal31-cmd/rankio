begin;

create or replace function public.finalize_paid_report_unlock(p_user_id uuid, p_report_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscription record;
  v_report record;
begin
  if p_user_id is null or p_report_id is null then
    return false;
  end if;

  select r.id, r.report_level
    into v_report
  from public.reports r
  join public.websites w on w.id = r.website_id
  where r.id = p_report_id
    and w.user_id = p_user_id
  limit 1
  for update of r;

  if not found then
    return false;
  end if;

  if exists (
    select 1
    from public.report_unlocks
    where user_id = p_user_id
      and report_id = p_report_id
  ) then
    update public.reports
      set report_level = 'full',
          generated_by = 'authenticated'
    where id = p_report_id;

    return true;
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

  if coalesce(v_subscription.lifetime_access, false) = false then
    if coalesce(v_subscription.report_quota, 0) <= coalesce(v_subscription.reports_used, 0) then
      return false;
    end if;

    update public.subscriptions
      set reports_used = coalesce(reports_used, 0) + 1,
          updated_at = now()
    where id = v_subscription.id;
  end if;

  update public.reports
    set report_level = 'full',
        generated_by = 'authenticated'
  where id = p_report_id;

  insert into public.report_unlocks (user_id, report_id)
  values (p_user_id, p_report_id)
  on conflict (user_id, report_id) do nothing;

  return true;
end;
$$;

grant execute on function public.finalize_paid_report_unlock(uuid, uuid) to authenticated;

commit;
