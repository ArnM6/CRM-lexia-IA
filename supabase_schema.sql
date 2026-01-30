
-- Run this entire script in your Supabase SQL Editor to reset and set up the database.

-- 1. CLEANUP (Drop tables with CASCADE to remove dependencies like foreign keys from other tables)
-- We add CASCADE to force deletion even if other tables (like checklist_tags) depend on them.
DROP TABLE IF EXISTS public.checklist_tags CASCADE; 
DROP TABLE IF EXISTS public.checklist_items CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.contacts CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;

-- 2. CREATE TABLES

-- Companies
create table public.companies (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  type text,
  importance text,
  pipeline_stage text,
  website text,
  last_contact_date timestamp with time zone,
  general_comment text,
  logo_url text
);

-- Contacts
create table public.contacts (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies(id) on delete cascade,
  name text not null,
  email text,
  role text,
  phone text,
  avatar_url text,
  linkedin_url text,
  gender text,
  is_main_contact boolean default false
);

-- Activities
create table public.activities (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies(id) on delete cascade,
  type text,
  title text,
  description text,
  date timestamp with time zone,
  user_name text,
  direction text,
  sync_status text
);

-- Documents
create table public.documents (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies(id) on delete cascade,
  name text,
  type text,
  url text,
  added_by text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Team Members
create table public.team_members (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies(id) on delete cascade,
  name text,
  role text,
  avatar_url text,
  email text
);

-- Checklist Items
create table public.checklist_items (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies(id) on delete cascade,
  stage_id text,
  label text,
  completed boolean,
  notes text
);

-- 3. SECURITY (Enable RLS and allow public access for demo purposes)
-- Note: In a real production app, you would restrict these policies to authenticated users.

alter table public.companies enable row level security;
create policy "Public access companies" on public.companies for all using (true);

alter table public.contacts enable row level security;
create policy "Public access contacts" on public.contacts for all using (true);

alter table public.activities enable row level security;
create policy "Public access activities" on public.activities for all using (true);

alter table public.documents enable row level security;
create policy "Public access documents" on public.documents for all using (true);

alter table public.team_members enable row level security;
create policy "Public access team" on public.team_members for all using (true);

alter table public.checklist_items enable row level security;
create policy "Public access checklist" on public.checklist_items for all using (true);
