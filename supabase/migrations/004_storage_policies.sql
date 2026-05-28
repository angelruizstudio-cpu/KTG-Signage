insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'signage-media',
  'signage-media',
  true,
  262144000,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "members can read organization media files"
on storage.objects for select
using (
  bucket_id = 'signage-media'
  and public.is_org_member(((storage.foldername(name))[1])::uuid)
);

create policy "owners admins editors can upload organization media files"
on storage.objects for insert
with check (
  bucket_id = 'signage-media'
  and public.has_org_role(((storage.foldername(name))[1])::uuid, array['owner', 'admin', 'editor'])
);

create policy "owners admins editors can update organization media files"
on storage.objects for update
using (
  bucket_id = 'signage-media'
  and public.has_org_role(((storage.foldername(name))[1])::uuid, array['owner', 'admin', 'editor'])
)
with check (
  bucket_id = 'signage-media'
  and public.has_org_role(((storage.foldername(name))[1])::uuid, array['owner', 'admin', 'editor'])
);

create policy "owners admins editors can delete organization media files"
on storage.objects for delete
using (
  bucket_id = 'signage-media'
  and public.has_org_role(((storage.foldername(name))[1])::uuid, array['owner', 'admin', 'editor'])
);
