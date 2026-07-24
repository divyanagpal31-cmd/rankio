create table if not exists public.scan_cancellations (
  scan_job_id uuid primary key,
  user_id uuid references auth.users(id) on delete set null,
  visitor_id uuid,
  created_at timestamptz not null default now()
);

alter table public.scan_cancellations enable row level security;

drop policy if exists "Users can view own scan cancellations" on public.scan_cancellations;
create policy "Users can view own scan cancellations"
on public.scan_cancellations
for select
using (user_id = auth.uid());

create index if not exists scan_cancellations_user_id_idx on public.scan_cancellations using btree (user_id);
create index if not exists scan_cancellations_visitor_id_idx on public.scan_cancellations using btree (visitor_id);
