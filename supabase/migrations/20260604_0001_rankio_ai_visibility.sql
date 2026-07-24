-- Rankio AI Visibility Platform
-- Forward-only migration for new scan/report infrastructure and entitlement fields.

begin;

create extension if not exists pgcrypto;

-- Existing schema alignment -------------------------------------------------

alter table public.subscriptions
  add column if not exists plan text,
  add column if not exists plan_slug text,
  add column if not exists report_quota integer,
  add column if not exists reports_used integer not null default 0,
  add column if not exists lifetime_access boolean not null default false,
  add column if not exists payment_provider text,
  add column if not exists payment_customer_id text,
  add column if not exists payment_subscription_id text,
  add column if not exists payment_order_id text,
  add column if not exists current_period_end timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update public.subscriptions
set
  plan = coalesce(plan, plan_name),
  plan_slug = coalesce(plan_slug, lower(nullif(plan_name, ''))),
  report_quota = coalesce(report_quota,
    case
      when lower(coalesce(plan_name, '')) in ('starter', 'starter plan') then 1
      when lower(coalesce(plan_name, '')) in ('growth', 'growth plan') then 5
      when lower(coalesce(plan_name, '')) in ('pro', 'pro plan') then 10
      when lower(coalesce(plan_name, '')) in ('free', 'free plan') then 0
      else 0
    end
  ),
  updated_at = now()
where plan_slug is null or report_quota is null;

alter table public.websites
  add column if not exists vertical text,
  add column if not exists scan_count integer not null default 0,
  add column if not exists latest_report_id uuid,
  add column if not exists latest_report_at timestamptz;

alter table public.reports
  add column if not exists scan_job_id uuid,
  add column if not exists report_level text not null default 'preview',
  add column if not exists access_tier_required text not null default 'free',
  add column if not exists preview_payload jsonb,
  add column if not exists score_breakdown jsonb,
  add column if not exists source_versions jsonb,
  add column if not exists is_cached boolean not null default false,
  add column if not exists generated_by text;

-- New infrastructure tables -------------------------------------------------

create table if not exists public.scan_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  visitor_id uuid,
  website_id uuid references public.websites(id) on delete cascade,
  url text not null,
  normalized_url text not null,
  vertical text,
  mode text not null default 'preview',
  status text not null default 'queued',
  progress integer not null default 0,
  error_code text,
  error_message text,
  source_versions jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table if not exists public.report_pages (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  url text not null,
  canonical_url text,
  status_code integer,
  depth integer not null default 0,
  title text,
  meta_description text,
  word_count integer,
  h1_count integer,
  h2_count integer,
  internal_links_out integer not null default 0,
  internal_links_in integer not null default 0,
  schema_types jsonb,
  page_score numeric,
  raw_meta jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.report_findings (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  page_id uuid references public.report_pages(id) on delete cascade,
  category text not null,
  severity text not null,
  signal_key text not null,
  title text not null,
  description text,
  recommendation text,
  evidence jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.content_chunks (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  page_id uuid references public.report_pages(id) on delete cascade,
  chunk_index integer not null default 0,
  chunk_text text not null,
  chunk_hash text not null,
  entity_tags jsonb,
  embedding_model text,
  answerability_score numeric,
  retrieval_relevance_score numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  property_id text not null,
  property_name text,
  status text not null default 'connected',
  scopes jsonb not null default '[]'::jsonb,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Optional share support for future use
create table if not exists public.report_shares (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  share_token text not null unique,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- RLS ----------------------------------------------------------------------

alter table public.scan_jobs enable row level security;
alter table public.report_pages enable row level security;
alter table public.report_findings enable row level security;
alter table public.content_chunks enable row level security;
alter table public.integrations enable row level security;
alter table public.report_shares enable row level security;

-- Constraints ---------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'subscriptions_plan_slug_check'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_plan_slug_check
      check (plan_slug is null or plan_slug in ('free', 'starter', 'growth', 'pro'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'subscriptions_status_check'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_status_check
      check (status is null or status in ('pending', 'active', 'past_due', 'canceled', 'expired', 'trialing'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'reports_report_level_check'
  ) then
    alter table public.reports
      add constraint reports_report_level_check
      check (report_level in ('preview', 'full'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'reports_access_tier_required_check'
  ) then
    alter table public.reports
      add constraint reports_access_tier_required_check
      check (access_tier_required in ('free', 'starter', 'growth', 'pro'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'scan_jobs_mode_check'
  ) then
    alter table public.scan_jobs
      add constraint scan_jobs_mode_check
      check (mode in ('preview', 'full', 'deep'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'scan_jobs_status_check'
  ) then
    alter table public.scan_jobs
      add constraint scan_jobs_status_check
      check (status in ('queued', 'running', 'completed', 'failed', 'canceled'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'report_findings_severity_check'
  ) then
    alter table public.report_findings
      add constraint report_findings_severity_check
      check (severity in ('low', 'medium', 'high', 'critical'));
  end if;
end $$;

-- Indexes ------------------------------------------------------------------

create index if not exists subscriptions_user_id_idx on public.subscriptions using btree (user_id);
create index if not exists subscriptions_plan_slug_idx on public.subscriptions using btree (plan_slug);
create index if not exists websites_vertical_idx on public.websites using btree (vertical);
create index if not exists websites_latest_report_id_idx on public.websites using btree (latest_report_id);
create index if not exists websites_latest_report_at_idx on public.websites using btree (latest_report_at desc);
create index if not exists reports_scan_job_id_idx on public.reports using btree (scan_job_id);
create index if not exists reports_generated_at_idx on public.reports using btree (generated_at desc);
create index if not exists scan_jobs_website_id_created_at_idx on public.scan_jobs using btree (website_id, created_at desc);
create index if not exists scan_jobs_user_id_created_at_idx on public.scan_jobs using btree (user_id, created_at desc);
create index if not exists scan_jobs_visitor_id_idx on public.scan_jobs using btree (visitor_id);
create index if not exists report_pages_report_id_idx on public.report_pages using btree (report_id);
create index if not exists report_findings_report_id_category_idx on public.report_findings using btree (report_id, category);
create index if not exists content_chunks_report_id_page_id_idx on public.content_chunks using btree (report_id, page_id);
create index if not exists integrations_user_provider_idx on public.integrations using btree (user_id, provider);

-- Policies -----------------------------------------------------------------

drop policy if exists "Users can view own scan jobs" on public.scan_jobs;
create policy "Users can view own scan jobs"
on public.scan_jobs
for select
to public
using (user_id = auth.uid());

drop policy if exists "Users can view report pages" on public.report_pages;
create policy "Users can view report pages"
on public.report_pages
for select
to public
using (
  exists (
    select 1
    from public.reports r
    join public.websites w on w.id = r.website_id
    where r.id = report_pages.report_id
      and w.user_id = auth.uid()
  )
);

drop policy if exists "Users can view report findings" on public.report_findings;
create policy "Users can view report findings"
on public.report_findings
for select
to public
using (
  exists (
    select 1
    from public.reports r
    join public.websites w on w.id = r.website_id
    where r.id = report_findings.report_id
      and w.user_id = auth.uid()
  )
);

drop policy if exists "Users can view content chunks" on public.content_chunks;
create policy "Users can view content chunks"
on public.content_chunks
for select
to public
using (
  exists (
    select 1
    from public.reports r
    join public.websites w on w.id = r.website_id
    where r.id = content_chunks.report_id
      and w.user_id = auth.uid()
  )
);

drop policy if exists "Users can manage integrations" on public.integrations;
create policy "Users can manage integrations"
on public.integrations
for all
to public
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can view own report shares" on public.report_shares;
create policy "Users can view own report shares"
on public.report_shares
for select
to public
using (
  exists (
    select 1
    from public.reports r
    join public.websites w on w.id = r.website_id
    where r.id = report_shares.report_id
      and w.user_id = auth.uid()
  )
);

-- Triggers -----------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_subscriptions_updated_at on public.subscriptions;
create trigger touch_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.touch_updated_at();

drop trigger if exists touch_integrations_updated_at on public.integrations;
create trigger touch_integrations_updated_at
before update on public.integrations
for each row execute function public.touch_updated_at();

create or replace function public.sync_website_report_summary()
returns trigger
language plpgsql
as $$
begin
  update public.websites
  set latest_report_id = new.id,
      latest_report_at = new.generated_at,
      last_scanned_at = new.generated_at,
      scan_count = coalesce(scan_count, 0) + 1
  where id = new.website_id;
  return new;
end;
$$;

drop trigger if exists sync_website_report_summary_trigger on public.reports;
create trigger sync_website_report_summary_trigger
after insert on public.reports
for each row execute function public.sync_website_report_summary();

create or replace function public.consume_report_credit(p_user_id uuid)
returns boolean
language plpgsql
as $$
declare
  v_quota integer;
  v_used integer;
  v_lifetime boolean;
begin
  select report_quota, reports_used, lifetime_access
    into v_quota, v_used, v_lifetime
  from public.subscriptions
  where user_id = p_user_id
  limit 1
  for update;

  if v_lifetime then
    return true;
  end if;

  if v_quota is null then
    return false;
  end if;

  if coalesce(v_used, 0) >= v_quota then
    return false;
  end if;

  update public.subscriptions
    set reports_used = coalesce(reports_used, 0) + 1,
        updated_at = now()
  where user_id = p_user_id;

  return true;
end;
$$;

create or replace function public.has_full_report_access(p_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.subscriptions s
    where s.user_id = p_user_id
      and (
        coalesce(s.lifetime_access, false) = true
        or (
          coalesce(s.status, '') in ('active', 'trialing')
          and coalesce(s.report_quota, 0) > coalesce(s.reports_used, 0)
        )
      )
  );
$$;

commit;
