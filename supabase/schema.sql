-- Run in Supabase SQL editor (Dashboard -> SQL Editor).
create table if not exists public.textio_documents (
  id          text not null,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null,
  content     text not null default '',
  created     bigint,
  modified    bigint not null default 0,
  timestamp   text,
  deleted     boolean not null default false,
  primary key (user_id, id)
);

alter table public.textio_documents enable row level security;

create policy "own documents" on public.textio_documents
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Already ran the first version? Add the tombstone column:
-- alter table public.textio_documents add column if not exists deleted boolean not null default false;
