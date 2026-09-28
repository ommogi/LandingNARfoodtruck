-- Lista explicita de quien puede editar la disponibilidad.
--
-- Por que no basta con `to authenticated`: esa condicion solo es segura si el
-- registro publico esta desactivado en el panel de Supabase Auth. Es un
-- interruptor que se puede olvidar, que se puede volver a activar sin querer y
-- que no deja rastro en el codigo. Si se activa, cualquiera que se registre pasa
-- a ser `authenticated` y puede reescribir el calendario.
--
-- Con esta tabla el permiso vive en la base de datos, versionado aqui: aunque el
-- registro este abierto, un usuario nuevo no puede tocar nada porque su email no
-- esta en `admins`.
--
-- Para dar acceso a alguien:
--   insert into public.admins (email, nombre) values ('quien@ejemplo.com', 'Nombre');
-- Para quitarselo:
--   delete from public.admins where email = 'quien@ejemplo.com';

create table if not exists public.admins (
  email      text primary key,
  nombre     text,
  creado_en  timestamptz not null default now()
);

alter table public.admins enable row level security;

-- `security definer` para que la funcion pueda leer `admins` sin que haga falta
-- una politica que exponga la tabla; `search_path` fijo para que nadie pueda
-- colar un esquema propio delante de public.
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to authenticated;

-- Un admin puede ver la lista de admins. Nadie la modifica desde la web: se
-- toca solo por SQL o desde el panel de Supabase.
drop policy if exists "lectura admins" on public.admins;
create policy "lectura admins" on public.admins
  for select to authenticated using (public.es_admin());

-- Sustituye a las politicas de 0001, que se conformaban con `authenticated`.
drop policy if exists "escritura admin" on public.disponibilidad;
create policy "escritura admin" on public.disponibilidad
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

drop policy if exists "escritura admin" on public.ajustes;
create policy "escritura admin" on public.ajustes
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
