import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { configNames, isConfigId } from '../../data/config-ids';
import { estadoFecha, formatearFecha } from '../../data/disponibilidad';

/** Ruta renderizada en servidor: el resto del sitio es estatico. */
export const prerender = false;

const MAX_BODY_BYTES = 12_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

/**
 * Limite por IP en memoria. Suficiente para un unico proceso; si la web se
 * despliega con varias instancias, sustituir por Redis o el limitador del CDN.
 */
const hits = new Map<string, number[]>();

const isRateLimited = (ip: string) => {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT_MAX;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });

const clean = (value: unknown, max = 500) =>
  String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, max);

/*
 * Colapsa a una sola linea lo que acaba en el asunto del correo: un valor
 * multilinea dejaria el asunto partido en la bandeja de entrada.
 */
const oneLine = (value: string) => value.replace(/\s+/g, ' ').trim();

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[char] as string;
  });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (isRateLimited(clientAddress)) {
    return json({ ok: false, message: 'Demasiadas solicitudes. Inténtalo en unos minutos.' }, 429);
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return json({ ok: false, message: 'Solicitud demasiado grande' }, 413);
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw || '{}') as Record<string, unknown>;
  } catch {
    return json({ ok: false, message: 'JSON no válido' }, 400);
  }

  // Honeypot relleno: se responde 200 para no dar pistas al bot, sin enviar nada.
  if (clean(data.website)) return json({ ok: true });

  const name = clean(data.name, 80);
  const email = clean(data.email, 160);
  const phone = clean(data.phone, 40);
  const eventType = clean(data.eventType, 60);
  const message = clean(data.message, 1500);
  const consent = data.consent === true || data.consent === 'on' || data.consent === '1';
  const date = clean(data.date, 20);
  /* Solo lo manda el asistente de reserva, y se acepta unicamente si es uno de
   * los cuatro ids conocidos: es lo que acaba en el asunto del correo. */
  const configId = clean(data.config, 20);
  const configName = isConfigId(configId) ? configNames[configId] : '';
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  const phoneValid = phone.replace(/\D/g, '').length >= 6;

  /*
   * Minimo para poder responder un presupuesto: quien es, como contactarle y de
   * que tipo de evento hablamos. Fecha, invitados, ubicacion y mensaje son
   * opcionales porque muchos leads llegan sin tenerlos decididos.
   */
  if (name.length < 2 || !emailValid || !phoneValid || !eventType || !consent) {
    return json({ ok: false, message: 'Faltan datos obligatorios' }, 422);
  }

  /*
   * La fecha se revalida contra src/data/disponibilidad.ts: el calendario ya
   * impide elegir dias ocupados, pero una pestana abierta desde hace dias o una
   * peticion manipulada podrian colarlos.
   *
   * Un dia ocupado se rechaza siempre; la antelacion minima solo se exige a los
   * leads del asistente, porque el formulario simple lleva un <input type=date>
   * libre y ahi una peticion urgente es un lead legitimo, no un error.
   */
  const estado = date ? estadoFecha(date) : null;
  if (estado === 'ocupado' || (configName && estado === 'bloqueado')) {
    return json({ ok: false, message: 'Esa fecha ya no está disponible' }, 422);
  }

  const lead = {
    customer: {
      name,
      email,
      phone,
    },
    event: {
      type: eventType,
      config: configName,
      date,
      location: clean(data.location, 160),
      guests: Number.parseInt(clean(data.guests, 10), 10) || null,
      message,
    },
    source: clean(data.source, 60) || 'landing-home',
    consent,
    createdAt: new Date().toISOString(),
  };

  const apiKey = import.meta.env.RESEND_API_KEY;
  const from = import.meta.env.LEAD_FROM_EMAIL;
  const to = import.meta.env.LEAD_TO_EMAIL;

  if (!apiKey || !from || !to) {
    // Sin credenciales no se pierde el lead: queda en el log del servidor.
    console.warn('[presupuesto] Falta configuracion de email. Lead sin enviar:', {
      eventType: lead.event.type,
      source: lead.source,
    });
    return json({ ok: false, message: 'El envío no está configurado todavía' }, 503);
  }

  const rows: [string, string][] = [
    ['Nombre', lead.customer.name],
    ['Email', lead.customer.email],
    ['Teléfono', lead.customer.phone || '—'],
    ['Tipo de evento', lead.event.type || '—'],
    ['Configuración', lead.event.config || '—'],
    ['Fecha', lead.event.date ? formatearFecha(lead.event.date) : 'Aún no definida'],
    ['Ubicación', lead.event.location || '—'],
    ['Invitados', lead.event.guests ? String(lead.event.guests) : '—'],
    ['Mensaje', lead.event.message || '—'],
    ['Origen', lead.source],
  ];

  /*
   * Asunto: los leads del asistente abren por configuracion y fecha, que es lo
   * que se mira en la bandeja para confirmar disponibilidad. Los del formulario
   * simple no traen configuracion y conservan el asunto de siempre.
   */
  const subject = oneLine(
    lead.event.config
      ? `Reserva ${lead.event.config} — ${lead.event.type} — ${
          lead.event.date ? formatearFecha(lead.event.date) : 'Fecha por definir'
        }`
      : `Solicitud de presupuesto — ${lead.event.type || 'Evento'}`,
  );

  const html = `<h2>Nueva solicitud de presupuesto</h2><table cellpadding="6">${rows
    .map(([label, value]) => `<tr><td><strong>${label}</strong></td><td>${escapeHtml(value)}</td></tr>`)
    .join('')}</table>`;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: lead.customer.email,
      subject,
      html,
    });

    if (error) throw new Error(error.message);
  } catch (error) {
    // Se registra el fallo sin datos personales.
    console.error('[presupuesto] Error de envio:', error instanceof Error ? error.message : error);
    return json({ ok: false, message: 'No se pudo enviar la solicitud' }, 502);
  }

  return json({ ok: true });
};

export const ALL: APIRoute = () =>
  json({ ok: false, message: 'Método no permitido' }, 405);
