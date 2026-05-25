-- Private bucket for raw study-material uploads. The browser uploads here
-- directly (bypassing Vercel's ~4.5 MB request-body cap); /api/generate
-- downloads with the service role and deletes the files afterwards.
insert into storage.buckets (id, name, public, file_size_limit)
values ('study-uploads', 'study-uploads', false, 26214400) -- 25 MB / file
on conflict (id) do nothing;

-- RLS: an authenticated user may only touch objects inside their own folder,
-- i.e. the first path segment equals their uid ("<uid>/<random>-<name>").
-- Server-side service-role access bypasses these policies.
drop policy if exists "study_uploads_insert_own" on storage.objects;
create policy "study_uploads_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'study-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "study_uploads_select_own" on storage.objects;
create policy "study_uploads_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'study-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "study_uploads_delete_own" on storage.objects;
create policy "study_uploads_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'study-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
