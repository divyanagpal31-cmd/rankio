begin;

with failed_scans as (
  select
    sj.user_id,
    sj.website_id,
    count(*)::integer as refund_count
  from public.scan_jobs sj
  left join public.reports r on r.scan_job_id = sj.id
  where sj.user_id is not null
    and sj.website_id is not null
    and sj.mode = 'full'
    and sj.status = 'failed'
    and sj.error_code is not null
    and r.id is null
  group by sj.user_id, sj.website_id
),
refund_by_user as (
  select
    user_id,
    sum(refund_count)::integer as refund_count
  from failed_scans
  group by user_id
),
latest_subscription as (
  select distinct on (s.user_id)
    s.id,
    s.user_id,
    r.refund_count
  from public.subscriptions s
  join refund_by_user r on r.user_id = s.user_id
  where lower(coalesce(s.status, '')) in ('active', 'trialing')
    and (
      coalesce(s.lifetime_access, false) = true
      or s.current_period_end is null
      or s.current_period_end >= now()
    )
  order by s.user_id, s.updated_at desc nulls last, s.current_period_end desc nulls last
)
update public.subscriptions s
  set reports_used = greatest(coalesce(s.reports_used, 0) - latest_subscription.refund_count, 0),
      updated_at = now()
from latest_subscription
where s.id = latest_subscription.id
  and coalesce(s.lifetime_access, false) = false
  and coalesce(s.reports_used, 0) > 0;

commit;
