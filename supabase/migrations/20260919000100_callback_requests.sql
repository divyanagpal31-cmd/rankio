begin;

create table if not exists public.callback_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  report_id uuid references public.reports(id) on delete set null,
  full_name text not null,
  email text not null,
  country text not null,
  phone text not null,
  company text,
  requirements text not null,
  website_url text,
  scan_scope text,
  source_url text,
  status text not null default 'new'
);

alter table public.callback_requests enable row level security;

drop policy if exists "callback_requests_insert_none" on public.callback_requests;
create policy "callback_requests_insert_none"
on public.callback_requests
for insert
to public
with check (false);

drop policy if exists "callback_requests_select_none" on public.callback_requests;
create policy "callback_requests_select_none"
on public.callback_requests
for select
to public
using (false);

drop policy if exists "callback_requests_update_none" on public.callback_requests;
create policy "callback_requests_update_none"
on public.callback_requests
for update
to public
using (false);

drop policy if exists "callback_requests_delete_none" on public.callback_requests;
create policy "callback_requests_delete_none"
on public.callback_requests
for delete
to public
using (false);

create index if not exists callback_requests_created_at_idx
  on public.callback_requests using btree (created_at desc);

create index if not exists callback_requests_email_idx
  on public.callback_requests using btree (email);

create index if not exists callback_requests_user_id_idx
  on public.callback_requests using btree (user_id);

create index if not exists callback_requests_report_id_idx
  on public.callback_requests using btree (report_id);

create index if not exists callback_requests_status_idx
  on public.callback_requests using btree (status);

commit;