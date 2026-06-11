-- Allow updating project logo files (required for upsert on re-upload)
create policy "Users can update own project logos"
on storage.objects for update
using (bucket_id = 'project-logos' and auth.uid()::text = (storage.foldername(name))[1]);
