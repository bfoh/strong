-- Additive and safe to rerun. Does not drop application tables or existing rows.
-- Apply with the Supabase SQL Editor or a database migration connection.
begin;
create table if not exists public.public_lead_rate_limits (
  quota_key text primary key check (length(quota_key) = 64),
  hits integer not null check (hits > 0),
  window_started timestamptz not null default now()
);
alter table public.public_lead_rate_limits enable row level security;
revoke all on public.public_lead_rate_limits from anon, authenticated;
grant select, insert, update, delete on public.public_lead_rate_limits to service_role;
create or replace function public.consume_public_lead_quota(p_key text, p_limit integer default 5, p_window_seconds integer default 600)
returns boolean language plpgsql volatile security invoker set search_path = public as $$
declare used integer;
begin
  if length(p_key) <> 64 or p_limit < 1 or p_limit > 100 or p_window_seconds < 1 or p_window_seconds > 86400 then return false; end if;
  insert into public.public_lead_rate_limits (quota_key, hits, window_started) values (p_key, 1, now())
  on conflict (quota_key) do update set
    hits = case when public_lead_rate_limits.window_started < now() - make_interval(secs => p_window_seconds) then 1 else public_lead_rate_limits.hits + 1 end,
    window_started = case when public_lead_rate_limits.window_started < now() - make_interval(secs => p_window_seconds) then now() else public_lead_rate_limits.window_started end
  returning hits into used;
  return used <= p_limit;
end;
$$;
revoke all on function public.consume_public_lead_quota(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_public_lead_quota(text, integer, integer) to service_role;
-- The bucket stays private. Application server authorizes every upload/read.
-- Restrictive policy prevents future broad permissive Storage policies from opening it.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'strong_media_server_only') then
    create policy strong_media_server_only on storage.objects as restrictive for all to anon, authenticated
    using (bucket_id <> 'strong-property-media') with check (bucket_id <> 'strong-property-media');
  end if;
end $$;
commit;
notify pgrst, 'reload schema';
