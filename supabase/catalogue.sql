-- Optional optimisation for distinct published-location filters. No new data model.
create or replace function public.public_property_locations()
returns table(location text)
language sql stable security invoker
set search_path = public
as $$ select distinct p.location from public.properties p where p.status = 'published' order by p.location; $$;
revoke execute on function public.public_property_locations() from public, anon, authenticated;
grant execute on function public.public_property_locations() to service_role;
