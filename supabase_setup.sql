-- Optional profile table for future database-backed role records.
-- Auth user role is currently read from auth.users raw_user_meta_data by auth.js.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null check (role in ('driver','owner')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Users can read their own profile"
on public.profiles for select
using (auth.uid() = id);

create policy "Users can insert their own profile"
on public.profiles for insert
with check (auth.uid() = id);

create policy "Users can update their own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);
