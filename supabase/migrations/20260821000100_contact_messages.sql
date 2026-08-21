begin;

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text not null,
  website_url text,
  reason text not null,
  message text not null,
  source text,
  status text not null default 'new'
);

alter table public.contact_messages enable row level security;

drop policy if exists "contact_messages_insert_none" on public.contact_messages;
create policy "contact_messages_insert_none"
on public.contact_messages
for insert
to public
with check (false);

drop policy if exists "contact_messages_select_none" on public.contact_messages;
create policy "contact_messages_select_none"
on public.contact_messages
for select
to public
using (false);

drop policy if exists "contact_messages_update_none" on public.contact_messages;
create policy "contact_messages_update_none"
on public.contact_messages
for update
to public
using (false);

drop policy if exists "contact_messages_delete_none" on public.contact_messages;
create policy "contact_messages_delete_none"
on public.contact_messages
for delete
to public
using (false);

create index if not exists contact_messages_created_at_idx
  on public.contact_messages using btree (created_at desc);

create index if not exists contact_messages_email_idx
  on public.contact_messages using btree (email);

create index if not exists contact_messages_user_id_idx
  on public.contact_messages using btree (user_id);

create index if not exists contact_messages_reason_idx
  on public.contact_messages using btree (reason);

commit;
