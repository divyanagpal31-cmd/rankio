create table if not exists public.public_rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  identifier_hash text not null,
  identifier_hint text,
  created_at timestamptz not null default now()
);

create index if not exists public_rate_limit_events_lookup_idx
on public.public_rate_limit_events using btree (action, identifier_hash, created_at desc);

create index if not exists public_rate_limit_events_created_at_idx
on public.public_rate_limit_events using btree (created_at desc);

alter table public.public_rate_limit_events enable row level security;

drop policy if exists "public_rate_limit_events_insert_none" on public.public_rate_limit_events;
create policy "public_rate_limit_events_insert_none"
on public.public_rate_limit_events
for insert
with check (false);

drop policy if exists "public_rate_limit_events_select_none" on public.public_rate_limit_events;
create policy "public_rate_limit_events_select_none"
on public.public_rate_limit_events
for select
using (false);

drop policy if exists "public_rate_limit_events_update_none" on public.public_rate_limit_events;
create policy "public_rate_limit_events_update_none"
on public.public_rate_limit_events
for update
using (false)
with check (false);

drop policy if exists "public_rate_limit_events_delete_none" on public.public_rate_limit_events;
create policy "public_rate_limit_events_delete_none"
on public.public_rate_limit_events
for delete
using (false);
