-- Run once in the Supabase SQL editor.
-- Each row is one Yjs update for a pad. Saving appends a row, so concurrent
-- saves never overwrite each other; the app merges rows when it loads a pad
-- and compacts long logs into one row.
create table if not exists public.pad_updates (
  id         bigint generated always as identity primary key,
  pad_id     text not null,
  update     text not null,                  -- Yjs update, base64
  created_at timestamptz not null default now()
);
create index if not exists pad_updates_pad_id_idx on public.pad_updates (pad_id, id);

-- Only the server (secret key) may touch this table; browsers never read it directly.
alter table public.pad_updates enable row level security;
