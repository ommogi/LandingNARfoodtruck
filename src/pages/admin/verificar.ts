/**
 * Paso 2 del acceso: canjear el codigo por una sesion.
 *
 * Tiene que correr en el servidor: es @supabase/ssr quien escribe las cookies de
 * sesion httpOnly en la respuesta (ver setAll en src/lib/supabase.ts), y una
 * cookie httpOnly no la puede poner el navegador.
 *
 * Verificar solo abre la sesion. Que ese email pueda ademas tocar el panel lo
 * decide es_admin() en src/middleware.ts, y las politicas RLS detras.
 *
 * El codigo por correo ya no es la forma normal de entrar: sirve para
 * recuperar la contrasena o crearla en el primer acceso. Por eso, ademas de la
 * sesion, se marca la cookie COOKIE_CLAVE_PENDIENTE y el middleware solo deja
 * pasar a /clave hasta que se fije una contrasena nueva.
 */

import type { APIRoute } from 'astro';
import { esCodigoValido } from '../../data/acceso';
import { COOKIE_CLAVE_PENDIENTE } from '../../lib/admin';

export const prerender = false;

const MAX_BODY_BYTES = 2_000;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  });

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  const supabase = locals.supabase;
  if (!supabase) return json({ ok: false, motivo: 'sin-configurar' }, 503);

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json({ ok: false, motivo: 'codigo' }, 413);

  let body: { email?: unknown; token?: unknown };
  try {
    body = JSON.parse(raw || '{}');
  } catch {
    return json({ ok: false, motivo: 'codigo' }, 400);
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const token = typeof body.token === 'string' ? body.token.trim() : '';

  if (!email || !esCodigoValido(token)) return json({ ok: false, motivo: 'codigo' }, 422);

  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });

  if (error) {
    if (error.status === 429) return json({ ok: false, motivo: 'limite' }, 429);

    /* El motivo real solo va al log: al navegador se le responde lo mismo tanto
       si el codigo es erroneo como si el email no tiene cuenta. */
    console.warn('[admin] No se pudo verificar el código:', error.message);
    return json({ ok: false, motivo: 'codigo' }, 401);
  }

  cookies.set(COOKIE_CLAVE_PENDIENTE, '1', {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    secure: import.meta.env.PROD,
    maxAge: 15 * 60,
  });

  return json({ ok: true });
};

export const ALL: APIRoute = () => json({ ok: false, motivo: 'metodo' }, 405);
