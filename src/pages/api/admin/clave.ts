/**
 * Fijar o cambiar la contrasena del panel.
 *
 * Dos casos:
 *   - Recuperacion / primer acceso: la sesion se abrio con el codigo por correo
 *     (cookie COOKIE_CLAVE_PENDIENTE). Basta con la contrasena nueva.
 *   - Cambio normal con sesion: se exige la actual y se comprueba con
 *     signInWithPassword antes de tocar nada, para que una sesion abierta y
 *     desatendida no baste para quedarse con la cuenta.
 *
 * El middleware ya ha exigido sesion de admin para llegar hasta aqui.
 */

import type { APIRoute } from 'astro';
import { COOKIE_CLAVE_PENDIENTE, MIN_LARGO_CLAVE, esperar, jsonPanel } from '../../../lib/admin';
import { crearLimitador } from '../../../lib/lead-utils';

export const prerender = false;

const limitado = crearLimitador(15 * 60_000, 6);

export const POST: APIRoute = async ({ request, locals, cookies, clientAddress }) => {
  const supabase = locals.supabase;
  if (!supabase || !locals.userEmail) return jsonPanel({ ok: false, motivo: 'sesion' }, 401);
  if (limitado(clientAddress)) return jsonPanel({ ok: false, motivo: 'limite' }, 429);

  let body: { actual?: unknown; nueva?: unknown };
  try {
    body = JSON.parse((await request.text()).slice(0, 2_000) || '{}');
  } catch {
    return jsonPanel({ ok: false, motivo: 'formato' }, 400);
  }

  const nueva = typeof body.nueva === 'string' ? body.nueva : '';
  const actual = typeof body.actual === 'string' ? body.actual : '';
  const recuperando = Boolean(cookies.get(COOKIE_CLAVE_PENDIENTE)?.value);

  if (nueva.length < MIN_LARGO_CLAVE || nueva.length > 128) {
    return jsonPanel({ ok: false, motivo: 'corta' }, 422);
  }

  if (!recuperando) {
    const { error } = await supabase.auth.signInWithPassword({ email: locals.userEmail, password: actual });
    if (error) {
      await esperar(400);
      return jsonPanel({ ok: false, motivo: 'actual' }, 401);
    }
  }

  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) {
    console.warn('[admin] No se pudo cambiar la contraseña:', error.code ?? error.message);
    // same_password y weak_password son errores que el cliente puede corregir.
    const motivo = error.code === 'same_password' ? 'igual' : error.code === 'weak_password' ? 'debil' : 'error';
    return jsonPanel({ ok: false, motivo }, motivo === 'error' ? 502 : 422);
  }

  cookies.delete(COOKIE_CLAVE_PENDIENTE, { path: '/' });
  return jsonPanel({ ok: true });
};

export const ALL: APIRoute = () => jsonPanel({ ok: false, motivo: 'metodo' }, 405);
