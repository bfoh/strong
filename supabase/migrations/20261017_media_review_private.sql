-- Additive protection for private original files, matching notes and review receipts.
-- This policy grants no access to any bucket. Staff use the server-authorized proxy.
begin;
drop policy if exists media_review_server_only on storage.objects;
create policy media_review_server_only on storage.objects
 as restrictive for all to anon,authenticated
 using(bucket_id <> 'strong-media-review')
 with check(bucket_id <> 'strong-media-review');
commit;
