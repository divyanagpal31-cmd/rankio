begin;

create table if not exists public.report_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid not null references public.reports(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, report_id)
);

create index if not exists report_unlocks_user_id_idx on public.report_unlocks using btree (user_id);
create index if not exists report_unlocks_report_id_idx on public.report_unlocks using btree (report_id);

create or replace function public.unlock_report_with_credit(p_report_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_subscription record;
  v_inserted integer := 0;
begin
  if v_user_id is null then
    return jsonb_build_object('status', 'needs_subscription');
  end if;

  if p_report_id is null then
    return jsonb_build_object('status', 'invalid_report');
  end if;

  if not exists (
    select 1
    from public.reports
    where id = p_report_id
  ) then
    return jsonb_build_object('status', 'invalid_report');
  end if;

  if exists (
    select 1
    from public.report_unlocks
    where user_id = v_user_id
      and report_id = p_report_id
  ) then
    return jsonb_build_object(
      'status', 'success',
      'already_unlocked', true,
      'charged', false
    );
  end if;

  select s.id, s.lifetime_access, s.report_quota, s.reports_used
    into v_subscription
  from public.subscriptions s
  where s.user_id = v_user_id
    and lower(coalesce(s.status, '')) = 'active'
    and (
      coalesce(s.lifetime_access, false) = true
      or s.current_period_end is null
      or s.current_period_end >= now()
    )
  order by s.updated_at desc nulls last, s.current_period_end desc nulls last
  limit 1
  for update;

  if not found then
    return jsonb_build_object('status', 'needs_subscription');
  end if;

  if coalesce(v_subscription.lifetime_access, false) = false
     and coalesce(v_subscription.reports_used, 0) >= coalesce(v_subscription.report_quota, 0) then
    return jsonb_build_object('status', 'quota_finished');
  end if;

  insert into public.report_unlocks (user_id, report_id)
  values (v_user_id, p_report_id)
  on conflict (user_id, report_id) do nothing;

  get diagnostics v_inserted = row_count;

  if coalesce(v_inserted, 0) = 0 then
    return jsonb_build_object(
      'status', 'success',
      'already_unlocked', true,
      'charged', false
    );
  end if;

  if coalesce(v_subscription.lifetime_access, false) = false then
    update public.subscriptions
    set reports_used = coalesce(reports_used, 0) + 1,
        updated_at = now()
    where id = v_subscription.id;

    return jsonb_build_object(
      'status', 'success',
      'already_unlocked', false,
      'charged', true
    );
  end if;

  return jsonb_build_object(
    'status', 'success',
    'already_unlocked', false,
    'charged', false
  );
end;
$$;

grant execute on function public.unlock_report_with_credit(uuid) to authenticated;

commit;
