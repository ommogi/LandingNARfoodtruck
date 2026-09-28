/**
 * Acceso al panel con correo y contrasena.
 *
 * Corre en el servidor porque es @supabase/ssr quien escribe las cookies de
 * sesion httpOnly (ver setAll en src/lib/supabase.ts).
 *
 * Contra la fuerza bruta:
 *   - limite de 5 intentos cada 15 min por IP y, aparte, por email;
 *   - respuesta de duracion fija, acierte o falle;
 *   - un unico mensaje de error: no se distingue "no existe", "contrasena
 *     incorrecta" ni "no es admin".
 * Supabase Auth aplica ademas sus propios limites por encima.
 */

import type { APIRoute } from 'astro';
import { esperar, jsonPanel } from '../../lib/admin';
import { crearLimitador } from '../../lib/lead-utils';

export const prerender = false;

const MAX_BODY_BYTES = 2_000;
const DURACION_MINIMA_MS = 450;
const porIp = crearLimitador(15 * 60_000, 5);
const porEmail = crearLimitador(15 * 60_000, 5);

export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
  const inicio = Date.now();
  const responder = async (data: unknown, status: number) => {
    await esperar(Math.max(0, DURACION_MINIMA_MS - (Date.now() - inicio)));
    return jsonPanel(data, status);
  };

  const supabase = locals.supabase;
  if (!supabase) return responder({ ok: false, motivo: 'sin-configurar' }, 503);

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return responder({ ok: false, motivo: 'credenciales' }, 413);

  let body: { email?: unknown; password?: unknown };
  try {
    body = JSON.parse(raw || '{}');
  } catch {
    return responder({ ok: false, motivo: 'credenciales' }, 400);
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 160) : '';
  const password = typeof body.password === 'string' ? body.password.slice(0, 200) : '';

  if (porIp(clientAddress) || (email && porEmail(email))) {
    return responder({ ok: false, motivo: 'limite' }, 429);
  }
  if (!email || !password) return responder({ ok: false, motivo: 'credenciales' }, 422);

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.status === 429) return responder({ ok: false, motivo: 'limite' }, 429);
    console.warn('[admin] Acceso con contraseña rechazado:', error.code ?? error.message);
    return responder({ ok: false, motivo: 'credenciales' }, 401);
  }

  // Credenciales buenas pero sin permiso: se cierra y se responde lo mismo.
  const { data: esAdmin } = await supabase.rpc('es_admin');
  if (esAdmin !== true) {
    await supabase.auth.signOut();
    return responder({ ok: false, motivo: 'credenciales' }, 401);
  }

  return responder({ ok: true }, 200);
};

export const ALL: APIRoute = () => jsonPanel({ ok: false, motivo: 'metodo' }, 405);
