-- Imagenes del configurador subidas desde /admin/configurador.
--
-- Bucket publico: las URLs se pintan en /configurador para cualquier visitante.
-- Solo los admins (es_admin() de 0002) pueden subir, sustituir o borrar.
-- Las imagenes iniciales no pasan por aqui: viven en public/configurador/.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('configurador', 'configurador', true, 5242880, array['image/webp', 'image/jpeg', 'image/png', 'image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "configurador lectura publica" on storage.objects;
create policy "configurador lectura publica" on storage.objects
  for select to anon, authenticated using (bucket_id = 'configurador');

drop policy if exists "configurador escritura admin" on storage.objects;
create policy "configurador escritura admin" on storage.objects
  for insert to authenticated with check (bucket_id = 'configurador' and public.es_admin());

drop policy if exists "configurador edicion admin" on storage.objects;
create policy "configurador edicion admin" on storage.objects
  for update to authenticated using (bucket_id = 'configurador' and public.es_admin());

drop policy if exists "configurador borrado admin" on storage.objects;
create policy "configurador borrado admin" on storage.objects
  for delete to authenticated using (bucket_id = 'configurador' and public.es_admin());
