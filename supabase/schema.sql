-- ============================================================
-- Wouter's Bachelor party planner — Supabase schema
-- Run this in the Supabase SQL Editor (one party, public access)
-- ============================================================

-- 1. SLOTS table (planning items per day)
create table if not exists public.slots (
  id          uuid primary key default gen_random_uuid(),
  party_id    text not null,
  day         int  not null,           -- 0 = prep, 1 = 13 jun, 2 = 14 jun
  position    int  not null default 0,
  time        text default '',
  title       text not null,
  subtitle    text default '',
  done        boolean default false,
  notes       jsonb default '[]'::jsonb,
  photos      jsonb default '[]'::jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists slots_party_idx on public.slots (party_id, day, position);

-- 2. GEAR table (mee te nemen items)
create table if not exists public.gear (
  id          uuid primary key default gen_random_uuid(),
  party_id    text not null,
  text        text not null,
  who         text default 'iedereen',
  got         boolean default false,
  created_at  timestamptz default now()
);
create index if not exists gear_party_idx on public.gear (party_id, created_at);

-- 3. updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists slots_touch on public.slots;
create trigger slots_touch before update on public.slots
  for each row execute function public.touch_updated_at();

-- 4. ENABLE RLS + open policies (one shared party, link = key)
alter table public.slots enable row level security;
alter table public.gear  enable row level security;

drop policy if exists "slots_all" on public.slots;
create policy "slots_all" on public.slots for all using (true) with check (true);

drop policy if exists "gear_all" on public.gear;
create policy "gear_all" on public.gear for all using (true) with check (true);

-- 5. ENABLE realtime
alter publication supabase_realtime add table public.slots;
alter publication supabase_realtime add table public.gear;

-- 6. STORAGE bucket for photos
insert into storage.buckets (id, name, public)
values ('party-photos', 'party-photos', true)
on conflict (id) do nothing;

drop policy if exists "party_photos_read"   on storage.objects;
drop policy if exists "party_photos_insert" on storage.objects;
drop policy if exists "party_photos_delete" on storage.objects;

create policy "party_photos_read" on storage.objects
  for select using (bucket_id = 'party-photos');

create policy "party_photos_insert" on storage.objects
  for insert with check (bucket_id = 'party-photos');

create policy "party_photos_delete" on storage.objects
  for delete using (bucket_id = 'party-photos');
