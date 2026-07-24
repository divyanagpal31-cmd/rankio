begin;

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  provider text not null,
  provider_order_id text not null,
  provider_capture_id text,
  provider_payer_id text,
  status text not null,
  plan_slug text,
  plan_name text,
  amount numeric(10, 2),
  currency text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_order_id)
);

alter table public.payment_transactions enable row level security;

alter table public.subscriptions
  add column if not exists latest_payment_transaction_id uuid references public.payment_transactions(id) on delete set null;

alter table public.report_unlocks
  add column if not exists subscription_id uuid references public.subscriptions(id) on delete set null,
  add column if not exists payment_transaction_id uuid references public.payment_transactions(id) on delete set null,
  add column if not exists plan_slug text,
  add column if not exists credit_used boolean not null default true,
  add column if not exists unlock_reason text not null default 'credit_consumed',
  add column if not exists is_cached boolean not null default false;

create index if not exists payment_transactions_user_id_created_at_idx
on public.payment_transactions using btree (user_id, created_at desc);

create index if not exists payment_transactions_subscription_id_idx
on public.payment_transactions using btree (subscription_id);

create index if not exists report_unlocks_subscription_id_idx
on public.report_unlocks using btree (subscription_id);

create index if not exists report_unlocks_payment_transaction_id_idx
on public.report_unlocks using btree (payment_transaction_id);

drop policy if exists "Users can view own payment transactions" on public.payment_transactions;
create policy "Users can view own payment transactions"
on public.payment_transactions
for select
to public
using (user_id = auth.uid());

alter table public.report_unlocks enable row level security;

drop policy if exists "Users can view own report unlocks" on public.report_unlocks;
create policy "Users can view own report unlocks"
on public.report_unlocks
for select
to public
using (user_id = auth.uid());

drop trigger if exists touch_payment_transactions_updated_at on public.payment_transactions;
create trigger touch_payment_transactions_updated_at
before update on public.payment_transactions
for each row execute function public.touch_updated_at();

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

  select r.id, r.report_level, coalesce(r.is_cached, false) as is_cached
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

  select
    s.id,
    s.plan_slug,
    s.report_quota,
    s.reports_used,
    s.lifetime_access,
    s.latest_payment_transaction_id
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

    update public.report_unlocks
      set subscription_id = coalesce(subscription_id, v_subscription.id),
          payment_transaction_id = coalesce(payment_transaction_id, v_subscription.latest_payment_transaction_id),
          plan_slug = coalesce(plan_slug, v_subscription.plan_slug),
          is_cached = coalesce(is_cached, v_report.is_cached)
    where user_id = p_user_id
      and report_id = p_report_id;

    return true;
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

  insert into public.report_unlocks (
    user_id,
    report_id,
    subscription_id,
    payment_transaction_id,
    plan_slug,
    credit_used,
    unlock_reason,
    is_cached
  )
  values (
    p_user_id,
    p_report_id,
    v_subscription.id,
    v_subscription.latest_payment_transaction_id,
    v_subscription.plan_slug,
    coalesce(v_subscription.lifetime_access, false) = false,
    case
      when coalesce(v_subscription.lifetime_access, false) = true then 'lifetime_access'
      else 'credit_consumed'
    end,
    v_report.is_cached
  )
  on conflict (user_id, report_id) do update
    set subscription_id = excluded.subscription_id,
        payment_transaction_id = excluded.payment_transaction_id,
        plan_slug = excluded.plan_slug,
        credit_used = excluded.credit_used,
        unlock_reason = excluded.unlock_reason,
        is_cached = excluded.is_cached;

  return true;
end;
$$;

create or replace function public.record_cached_report_unlock(
  p_user_id uuid,
  p_report_id uuid,
  p_unlock_reason text default 'cached_rescan_24h'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscription record;
begin
  if p_user_id is null or p_report_id is null then
    return false;
  end if;

  if not exists (
    select 1
    from public.reports r
    join public.websites w on w.id = r.website_id
    where r.id = p_report_id
      and w.user_id = p_user_id
  ) then
    return false;
  end if;

  select
    s.id,
    s.plan_slug,
    s.latest_payment_transaction_id
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
  limit 1;

  if not found then
    return false;
  end if;

  update public.reports
    set report_level = 'full',
        generated_by = 'authenticated'
  where id = p_report_id;

  insert into public.report_unlocks (
    user_id,
    report_id,
    subscription_id,
    payment_transaction_id,
    plan_slug,
    credit_used,
    unlock_reason,
    is_cached
  )
  values (
    p_user_id,
    p_report_id,
    v_subscription.id,
    v_subscription.latest_payment_transaction_id,
    v_subscription.plan_slug,
    false,
    coalesce(nullif(p_unlock_reason, ''), 'cached_rescan_24h'),
    true
  )
  on conflict (user_id, report_id) do update
    set subscription_id = excluded.subscription_id,
        payment_transaction_id = excluded.payment_transaction_id,
        plan_slug = excluded.plan_slug,
        credit_used = false,
        unlock_reason = excluded.unlock_reason,
        is_cached = true;

  return true;
end;
$$;

create or replace function public.unlock_report_with_credit(p_report_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_subscription record;
  v_report record;
  v_inserted integer := 0;
begin
  if v_user_id is null then
    return jsonb_build_object('status', 'needs_subscription');
  end if;

  if p_report_id is null then
    return jsonb_build_object('status', 'invalid_report');
  end if;

  select r.id, coalesce(r.is_cached, false) as is_cached
    into v_report
  from public.reports r
  join public.websites w on w.id = r.website_id
  where r.id = p_report_id
    and w.user_id = v_user_id
  limit 1
  for update of r;

  if not found then
    return jsonb_build_object('status', 'invalid_report');
  end if;

  if exists (
    select 1
    from public.report_unlocks
    where user_id = v_user_id
      and report_id = p_report_id
  ) then
    update public.reports
      set report_level = 'full',
          generated_by = 'authenticated'
    where id = p_report_id;

    return jsonb_build_object(
      'status', 'success',
      'already_unlocked', true,
      'charged', false
    );
  end if;

  select
    s.id,
    s.lifetime_access,
    s.report_quota,
    s.reports_used,
    s.plan_slug,
    s.latest_payment_transaction_id
    into v_subscription
  from public.subscriptions s
  where s.user_id = v_user_id
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
    return jsonb_build_object('status', 'needs_subscription');
  end if;

  if coalesce(v_subscription.lifetime_access, false) = false
     and coalesce(v_subscription.reports_used, 0) >= coalesce(v_subscription.report_quota, 0) then
    return jsonb_build_object('status', 'quota_finished');
  end if;

  insert into public.report_unlocks (
    user_id,
    report_id,
    subscription_id,
    payment_transaction_id,
    plan_slug,
    credit_used,
    unlock_reason,
    is_cached
  )
  values (
    v_user_id,
    p_report_id,
    v_subscription.id,
    v_subscription.latest_payment_transaction_id,
    v_subscription.plan_slug,
    coalesce(v_subscription.lifetime_access, false) = false,
    case
      when coalesce(v_subscription.lifetime_access, false) = true then 'lifetime_access'
      else 'credit_consumed'
    end,
    v_report.is_cached
  )
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
  end if;

  update public.reports
    set report_level = 'full',
        generated_by = 'authenticated'
  where id = p_report_id;

  return jsonb_build_object(
    'status', 'success',
    'already_unlocked', false,
    'charged', coalesce(v_subscription.lifetime_access, false) = false
  );
end;
$$;

grant execute on function public.finalize_paid_report_unlock(uuid, uuid) to authenticated;
grant execute on function public.record_cached_report_unlock(uuid, uuid, text) to authenticated;
grant execute on function public.unlock_report_with_credit(uuid) to authenticated;

commit;
