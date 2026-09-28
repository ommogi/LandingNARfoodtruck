/**
 * Puerta de entrada del panel de gestion.
 *
 * El panel NO vive en /admin a la vista: se entra por una URL secreta,
 * /{ADMIN_PATH}, que se fija con la variable de servidor ADMIN_PATH y no
 * aparece en el codigo ni en el repositorio. Este middleware:
 *
 *   1. Responde 404 a cualquier peticion directa a /admin o /api/admin: las
 *      rutas internas no existen para el exterior.
 *   2. Reescribe /{ADMIN_PATH}/...     -> /admin/...
 *               /{ADMIN_PATH}/api/... -> /api/admin/...
 *      sin cambiar la URL del navegador.
 *   3. Resuelve la sesion y exige que el email este en `admins` (es_admin()).
 *      Sin permiso, las paginas llevan al login y las APIs responden 404 para no
 *      confirmar siquiera que existen.
 *   4. Si la sesion se abrio con el codigo por correo (recuperacion o primer
 *      acceso), solo deja fijar la contrasena: el codigo no es un acceso
 *      directo al panel.
 *
 * No es la unica barrera: las politicas RLS de Supabase vuelven a comprobar
 * quien escribe. Si esta funcion tuviera un fallo, la base de datos seguiria
 * rechazando la escritura.
 */

import { defineMiddleware } from 'astro:middleware';
import { createRequestClient } from './lib/supabase';
import { COOKIE_CLAVE_PENDIENTE, adminBase } from './lib/admin';

/** Accesibles sin sesion: si no, no habria forma de iniciarla. */
const PUBLICAS = ['/admin/login', '/admin/entrar', '/admin/codigo', '/admin/verificar'];

/** Abren la sesion, no la leen: resolverla antes seria un viaje a Supabase de mas. */
const SIN_SESION = ['/admin/entrar', '/admin/codigo', '/admin/verificar'];

/** Unico destino permitido mientras la contrasena esta pendiente de fijar. */
const SOLO_CLAVE = ['/admin/clave', '/api/admin/clave', '/admin/logout'];

const CABECERAS_PANEL: Record<string, string> = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  /*
   * La URL secreta no debe viajar como Referer a ninguna otra web. `same-origin`
   * y no `no-referrer`: con no-referrer el navegador manda `Origin: null` en los
   * formularios y la proteccion CSRF de Astro rechaza el POST de la vista previa.
   */
  'Referrer-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

const noEncontrado = () =>
  new Response('Not found', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });

const esInterna = (pathname: string) =>
  pathname === '/admin' ||
  pathname.startsWith('/admin/') ||
  pathname === '/api/admin' ||
  pathname.startsWith('/api/admin/');

/** /{base}/x -> /admin/x ; /{base}/api/x -> /api/admin/x. null si no es del panel. */
const aInterna = (pathname: string, base: string): string | null => {
  if (pathname !== base && !pathname.startsWith(`${base}/`)) return null;
  const resto = pathname.slice(base.length).replace(/\/$/, '');
  if (resto === '/api' || resto.startsWith('/api/')) return `/api/admin${resto.slice(4)}`;
  return `/admin${resto}`;
};

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, request, cookies, locals } = context;

  locals.supabase ??= createRequestClient(request, cookies);
  locals.userEmail ??= '';

  // Segunda pasada tras la reescritura: ya se valido todo en la primera.
  if (locals.adminInterno) return next();

  const base = adminBase();
  locals.adminBase = base ?? '';

  if (esInterna(url.pathname)) return noEncontrado();

  const interna = base ? aInterna(url.pathname, base) : null;
  if (!interna) return next();

  const esApi = interna.startsWith('/api/');
  const publica = PUBLICAS.includes(interna);

  /*
   * getUser() valida el token contra Supabase; getSession() solo lee la cookie,
   * que el navegador puede falsificar. Tener cuenta no basta: el email tiene que
   * estar en `admins`, lo decide es_admin() (la misma funcion que usa RLS).
   */
  if (locals.supabase && !SIN_SESION.includes(interna)) {
    const { data } = await locals.supabase.auth.getUser();
    const email = data.user?.email ?? '';
    if (email) {
      const { data: esAdmin, error } = await locals.supabase.rpc('es_admin');
      if (error) console.warn('[admin] No se pudo comprobar el permiso:', error.message);
      if (esAdmin === true) locals.userEmail = email;
    }
  }

  const conCabeceras = (response: Response) => {
    for (const [k, v] of Object.entries(CABECERAS_PANEL)) response.headers.set(k, v);
    return response;
  };

  if (!publica && !locals.userEmail) {
    if (esApi) return noEncontrado();
    return conCabeceras(context.redirect(`${base}/login`, 302));
  }

  // Sesion abierta con el codigo: primero, contrasena nueva.
  if (locals.userEmail && cookies.get(COOKIE_CLAVE_PENDIENTE)?.value && !SOLO_CLAVE.includes(interna) && !publica) {
    if (esApi) return noEncontrado();
    return conCabeceras(context.redirect(`${base}/clave`, 302));
  }

  locals.adminInterno = true;
  const respuesta = conCabeceras(await next(interna + url.search));
  // La vista previa va en un iframe del propio panel: mismo origen, nada mas.
  if (interna === '/admin/vista') respuesta.headers.set('X-Frame-Options', 'SAMEORIGIN');
  return respuesta;
});
