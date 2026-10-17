-- Phase One, additive. Apply AFTER 20261012_live_security.sql in Supabase SQL Editor.
-- Existing records are not approved automatically. Review each genuine property before publishing.
begin;
alter table public.properties
 add column if not exists region text,
 add column if not exists city text not null default '',
 add column if not exists locality text not null default '',
 add column if not exists approximate_address text not null default '',
 add column if not exists property_type text not null default '',
 add column if not exists availability text not null default 'unknown',
 add column if not exists featured boolean not null default false,
 add column if not exists review_status text not null default 'draft',
 add column if not exists publication_authorized boolean not null default false,
 add column if not exists approved_by uuid references public.staff_profiles(id),
 add column if not exists approved_at timestamptz;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='properties_ghana_region' and conrelid='public.properties'::regclass) then
  alter table public.properties add constraint properties_ghana_region check(region is null or region in ('Ahafo','Ashanti','Bono','Bono East','Central','Eastern','Greater Accra','North East','Northern','Oti','Savannah','Upper East','Upper West','Volta','Western','Western North'));
 end if;
 if not exists(select 1 from pg_constraint where conname='properties_launch_states' and conrelid='public.properties'::regclass) then
  alter table public.properties add constraint properties_launch_states check(availability in ('unknown','available','reserved','sold') and review_status in ('draft','review','approved'));
 end if;
end $$;
create index if not exists properties_discovery on public.properties(region,city,featured desc,created_at desc) where status='published' and review_status='approved' and publication_authorized and availability='available';

-- Restrictive policies intersect any older permissive policies; they do not grant extra access.
alter table public.properties enable row level security;
drop policy if exists launch_property_read_gate on public.properties;
create policy launch_property_read_gate on public.properties as restrictive for select to anon,authenticated using(status='published' and review_status='approved' and publication_authorized and availability='available');
do $$ declare t text; begin
 foreach t in array array['enquiries','appointments','lead_activities','audit_logs','staff_profiles','property_features','property_media'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('drop policy if exists launch_private_only on public.%I',t);
  execute format('create policy launch_private_only on public.%I as restrictive for all to anon,authenticated using(false) with check(false)',t);
 end loop;
end $$;
-- The server mediates private files, including general enquiries and attribution sidecars.
drop policy if exists launch_storage_private on storage.objects;
create policy launch_storage_private on storage.objects as restrictive for all to anon,authenticated using(bucket_id not in ('strong-property-media','strong-homepage-private','strong-media-review')) with check(bucket_id not in ('strong-property-media','strong-homepage-private','strong-media-review'));

create or replace function public.public_property_discovery()
returns table(region text,city text,location text,property_count bigint)
language sql stable security invoker set search_path=public,pg_temp as $$
 select p.region,p.city,p.location,count(*) from public.properties p
 where p.status='published' and p.review_status='approved' and p.publication_authorized and p.availability='available' and p.region is not null
 group by p.region,p.city,p.location order by p.region,p.city,p.location;
$$;
revoke all on function public.public_property_discovery() from public,anon,authenticated;
grant execute on function public.public_property_discovery() to service_role;

-- A single transaction saves the listing, specifications and audit entry.
-- Only the service role may call this; actor must be a current authorized staff member.
create or replace function public.save_property_launch(p jsonb,actor uuid)
returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare property_uuid uuid := coalesce(nullif(p->>'id','')::uuid,gen_random_uuid());
begin
 if not exists(select 1 from public.staff_profiles where id=actor and role in ('admin','manager','editor')) then raise exception 'Unauthorized'; end if;
 if p->>'status'='published' and not(coalesce((p->>'publication_authorized')::boolean,false) and p->>'review_status'='approved' and p->>'availability'='available' and nullif(p->>'region','') is not null and nullif(p->>'city','') is not null and nullif(p->>'property_type','') is not null) then raise exception 'Publication requires approval, authorization and complete location'; end if;
 if nullif(p->>'id','') is not null and not exists(select 1 from public.properties where id=property_uuid) then raise exception 'Property not found'; end if;
 insert into public.properties(id,title,slug,category,location,price,currency,image,images,beds,baths,description,status,region,city,locality,approximate_address,property_type,availability,featured,review_status,publication_authorized,approved_by,approved_at,updated_at)
 values(property_uuid,p->>'title',p->>'slug',p->>'category',p->>'location',nullif(p->>'price','')::numeric,'GHS',p->>'image',array(select jsonb_array_elements_text(p->'images')),nullif(p->>'beds','')::integer,nullif(p->>'baths','')::integer,p->>'description',p->>'status',nullif(p->>'region',''),p->>'city',p->>'locality',p->>'approximate_address',p->>'property_type',p->>'availability',(p->>'featured')::boolean,p->>'review_status',(p->>'publication_authorized')::boolean,case when p->>'review_status'='approved' then actor end,case when p->>'review_status'='approved' then now() end,now())
 on conflict(id) do update set title=excluded.title,slug=excluded.slug,category=excluded.category,location=excluded.location,price=excluded.price,currency='GHS',image=excluded.image,images=excluded.images,beds=excluded.beds,baths=excluded.baths,description=excluded.description,status=excluded.status,region=excluded.region,city=excluded.city,locality=excluded.locality,approximate_address=excluded.approximate_address,property_type=excluded.property_type,availability=excluded.availability,featured=excluded.featured,review_status=excluded.review_status,publication_authorized=excluded.publication_authorized,approved_by=excluded.approved_by,approved_at=excluded.approved_at,updated_at=now();
 insert into public.property_features(property_id,plot_size_sqm,building_size_sqm,tenure,documentation_status,amenities)
 values(property_uuid,nullif(p->>'plot_size_sqm','')::numeric,nullif(p->>'building_size_sqm','')::numeric,p->>'tenure',p->>'documentation_status',p->'amenities')
 on conflict(property_id) do update set plot_size_sqm=excluded.plot_size_sqm,building_size_sqm=excluded.building_size_sqm,tenure=excluded.tenure,documentation_status=excluded.documentation_status,amenities=excluded.amenities;
 insert into public.audit_logs(actor_id,entity_type,entity_id,action,details) values(actor,'property',property_uuid,'save',jsonb_build_object('status',p->>'status','review_status',p->>'review_status','publication_authorized',p->>'publication_authorized'));
 return property_uuid;
end $$;
revoke all on function public.save_property_launch(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.save_property_launch(jsonb,uuid) to service_role;
notify pgrst,'reload schema';
commit;
