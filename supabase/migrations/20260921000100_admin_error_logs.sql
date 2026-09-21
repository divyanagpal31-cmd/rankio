create table if not exists public.admin_error_logs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  severity text not null default 'error',
  code text,
  message text not null,
  details jsonb not null default '{}'::jsonb,
  user_id uuid references public.profiles(id) on delete set null,
  report_id uuid references public.reports(id) on delete set null,
  website_url text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint admin_error_logs_severity_check check (severity in ('info', 'warning', 'error', 'critical'))
);

create index if not exists admin_error_logs_created_at_idx
on public.admin_error_logs using btree (created_at desc);

create index if not exists admin_error_logs_source_idx
on public.admin_error_logs using btree (source);

create index if not exists admin_error_logs_severity_idx
on public.admin_error_logs using btree (severity);

alter table public.admin_error_logs enable row level security;

drop policy if exists "admin_error_logs_insert_none" on public.admin_error_logs;
create policy "admin_error_logs_insert_none"
on public.admin_error_logs
for insert
with check (false);

drop policy if exists "admin_error_logs_select_none" on public.admin_error_logs;
create policy "admin_error_logs_select_none"
on public.admin_error_logs
for select
using (false);

drop policy if exists "admin_error_logs_update_none" on public.admin_error_logs;
create policy "admin_error_logs_update_none"
on public.admin_error_logs
for update
using (false)
with check (false);

drop policy if exists "admin_error_logs_delete_none" on public.admin_error_logs;
create policy "admin_error_logs_delete_none"
on public.admin_error_logs
for delete
using (false);
