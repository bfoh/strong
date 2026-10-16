-- Apply in Supabase SQL Editor. Public submissions are handled by server endpoints.
create extension if not exists pgcrypto;
create table if not exists properties (
 id uuid primary key default gen_random_uuid(),slug text unique not null,title text not null,
 category text not null check(category in ('land','residential','commercial')),
 location text not null,price numeric(16,2) check(price>=0),currency text not null default 'GHS',
 description text not null default '',image text not null default '',images text[] not null default '{}',
 beds integer check(beds>=0),baths integer check(baths>=0),
 status text not null default 'draft' check(status in ('draft','published','under_offer','sold','archived')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists property_media(id uuid primary key default gen_random_uuid(),property_id uuid not null references properties(id) on delete cascade,kind text not null check(kind in ('image','video','tour','document')),url text not null,caption text,sort_order integer not null default 0,created_at timestamptz not null default now());
create table if not exists property_features(id uuid primary key default gen_random_uuid(),property_id uuid not null unique references properties(id) on delete cascade,plot_size_sqm numeric,building_size_sqm numeric,tenure text,documentation_status text,amenities jsonb not null default '[]'::jsonb);
create table if not exists staff_profiles(id uuid primary key references auth.users(id) on delete cascade,full_name text not null,role text not null check(role in ('admin','editor','agent','manager')));
create table if not exists enquiries(id uuid primary key default gen_random_uuid(),property_id uuid not null references properties(id),name text not null,phone text not null,email text,message text,status text not null default 'new' check(status in ('new','contacted','qualified','closed')),assigned_to uuid references staff_profiles(id),created_at timestamptz not null default now());
create table if not exists appointments(id uuid primary key default gen_random_uuid(),property_id uuid not null references properties(id),name text not null,phone text not null,email text,message text,preferred_date date not null,preferred_time time not null,status text not null default 'requested' check(status in ('requested','confirmed','rescheduled','completed','cancelled')),assigned_to uuid references staff_profiles(id),created_at timestamptz not null default now());
create table if not exists lead_activities(id uuid primary key default gen_random_uuid(),enquiry_id uuid references enquiries(id),appointment_id uuid references appointments(id),staff_id uuid references staff_profiles(id),activity_type text not null,notes text,created_at timestamptz not null default now(),check(enquiry_id is not null or appointment_id is not null));
create table if not exists audit_logs(id uuid primary key default gen_random_uuid(),actor_id uuid references staff_profiles(id),entity_type text not null,entity_id uuid not null,action text not null,details jsonb not null default '{}'::jsonb,created_at timestamptz not null default now());
-- Deny direct browser table access. Server uses service-role credentials only.
alter table properties enable row level security;
alter table property_media enable row level security;
alter table property_features enable row level security;
alter table staff_profiles enable row level security;
alter table enquiries enable row level security;
alter table appointments enable row level security;
alter table lead_activities enable row level security;
alter table audit_logs enable row level security;
-- Public read only for published properties (if anon client introduced later).
create policy "Published properties visible" on properties for select to anon using(status='published');

-- Staff authentication: create users through Supabase Auth, then insert their auth UUID into staff_profiles.
create index if not exists idx_properties_status_created on properties(status,created_at desc);
create index if not exists idx_enquiries_created on enquiries(created_at desc);
create index if not exists idx_appointments_created on appointments(created_at desc);
