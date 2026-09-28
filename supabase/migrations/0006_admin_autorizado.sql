-- ¿Este correo puede entrar al panel? Para que el login diga «no autorizado»
-- en vez de fingir que ha enviado un codigo.
--
-- La tabla `admins` no es legible desde fuera (0002). Esta funcion responde
-- solo si recibe la clave de configurador_secreto (0003), que vive en la
-- variable de servidor CONFIGURADOR_PRICING_SECRET: la anon key, que es
-- publica, no basta para ir probando correos. Con otra clave devuelve false.

create or replace function public.admin_autorizado(correo text, clave text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.configurador_secreto s
    where s.id = 1 and s.clave = admin_autorizado.clave
  ) and exists (
    select 1 from public.admins a
    where lower(a.email) = lower(trim(admin_autorizado.correo))
  );
$$;

revoke all on function public.admin_autorizado(text, text) from public;
grant execute on function public.admin_autorizado(text, text) to anon, authenticated;
