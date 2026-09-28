/**
 * Paso 1 del acceso: pedir el codigo de un solo uso.
 *
 * Se pide desde el servidor y sin `emailRedirectTo` a proposito. Con redirect,
 * Supabase manda un enlace que hay que canjear en el mismo navegador (flujo
 * PKCE); sin el, manda un codigo de 6 digitos que sirve desde cualquier sitio.
 *
 * La respuesta es siempre la misma, haya o no cuenta con ese email. Decir "ese
 * usuario no existe" seria confirmarle a un curioso que emails tienen acceso al
 * panel. La unica excepcion es el limite de envio: ahi el cliente si puede hacer
 * algo (esperar) y callarselo fue justo lo que hizo el fallo indescifrable.
 */

import type { APIRoute } from 'astro';

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

export const POST: APIRoute = async ({ request, locals }) => {
  const supabase = locals.supabase;
  if (!supabase) return json({ ok: false, motivo: 'sin-configurar' }, 503);

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json({ ok: false, motivo: 'envio' }, 413);

  let body: { email?: unknown };
  try {
    body = JSON.parse(raw || '{}');
  } catch {
    return json({ ok: false, motivo: 'envio' }, 400);
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, motivo: 'email' }, 422);
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    // El panel es para una cuenta ya invitada: no se crean usuarios desde aqui.
    options: { shouldCreateUser: false },
  });

  if (error) {
    /*
     * Los dos 429 de Supabase no se arreglan igual y decirlos como uno solo deja
     * al cliente esperando el tiempo equivocado:
     *   - over_email_send_rate_limit: tope de correos del proyecto (2/hora con el
     *     SMTP integrado). Se pasa esperando la hora o poniendo SMTP propio.
     *   - el resto: cooldown de ~60 s entre peticiones del mismo email.
     */
    if (error.status === 429) {
      const motivo = error.code === 'over_email_send_rate_limit' ? 'limite-hora' : 'limite';
      console.warn('[admin] Límite de envío:', error.code ?? error.message);
      return json({ ok: false, motivo }, 429);
    }

    // 400/422 es "ese usuario no existe": se responde el mensaje neutro de siempre.
    if (error.status !== 400 && error.status !== 422) {
      console.warn('[admin] No se pudo enviar el código:', error.message);
      return json({ ok: false, motivo: 'envio' }, 502);
    }
  }

  return json({ ok: true });
};

export const ALL: APIRoute = () => json({ ok: false, motivo: 'metodo' }, 405);
