-- =========================================================================
-- NOTED BY BLAZED: ACADEMIC HUB & JADWAL KULIAH
-- SUPABASE POSTGRESQL DATABASE SCHEMA
-- =========================================================================

-- 1. Table: Workspaces (Ruang Kerja Akademik / Semester / Kelompok)
create table if not exists public.workspaces (
  id text primary key,
  name text not null,
  description text,
  icon text default '🎓',
  color text default 'emerald',
  owner_id text not null,
  invite_code text unique,
  members jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Table: Schedules (Jadwal Mata Kuliah Mingguan)
create table if not exists public.schedules (
  id text primary key,
  workspace_id text references public.workspaces(id) on delete cascade,
  subject text not null,
  code text,
  lecturer text,
  day text not null,
  start_time text not null,
  end_time text not null,
  room text,
  sks integer default 3,
  color_tag text,
  notes text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Table: Tasks (To-Do List Tugas Kuliah & Berkas PDF)
create table if not exists public.tasks (
  id text primary key,
  workspace_id text references public.workspaces(id) on delete cascade,
  title text not null,
  subject text,
  due_date text,
  due_time text,
  priority text default 'Medium',
  status text default 'pending',
  completed boolean default false,
  description text,
  attachments jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Table: Notes (Catatan Materi Kuliah)
create table if not exists public.notes (
  id text primary key,
  workspace_id text references public.workspaces(id) on delete cascade,
  title text not null,
  subject text,
  category text default 'Materi Kuliah',
  content text,
  color text default 'yellow',
  pinned boolean default false,
  favorite boolean default false,
  attachments jsonb default '[]'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. Table: Workspace Settings (Konfigurasi WhatsApp Gateway & Alarm)
create table if not exists public.workspace_settings (
  workspace_id text primary key references public.workspaces(id) on delete cascade,
  whatsapp jsonb default '{}'::jsonb,
  alarm jsonb default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
alter table public.workspaces enable row level security;
alter table public.schedules enable row level security;
alter table public.tasks enable row level security;
alter table public.notes enable row level security;
alter table public.workspace_settings enable row level security;

-- Policies (Public / Authenticated Read & Write)
create policy "Allow all on workspaces" on public.workspaces for all using (true) with check (true);
create policy "Allow all on schedules" on public.schedules for all using (true) with check (true);
create policy "Allow all on tasks" on public.tasks for all using (true) with check (true);
create policy "Allow all on notes" on public.notes for all using (true) with check (true);
create policy "Allow all on workspace_settings" on public.workspace_settings for all using (true) with check (true);
