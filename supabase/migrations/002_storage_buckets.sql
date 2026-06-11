-- Storage buckets for avatars and project logos
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('project-logos', 'project-logos', true)
on conflict (id) do nothing;

-- Avatar upload policies (solo user)
create policy "Users can upload own avatar"
on storage.objects for insert
with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update own avatar"
on storage.objects for update
using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Anyone can view avatars"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "Users can upload project logos"
on storage.objects for insert
with check (bucket_id = 'project-logos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Anyone can view project logos"
on storage.objects for select
using (bucket_id = 'project-logos');
