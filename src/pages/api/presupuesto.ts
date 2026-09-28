import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { configNames, isConfigId } from '../../data/config-ids';
import { estadoFecha, formatearFecha, parsearFechas } from '../../data/disponibilidad';
import { esPrefijoValido } from '../../data/prefijos';
import { getDisponibilidad } from '../../lib/disponibilidad-server';
import { clean, crearLimitador, escapeHtml, json, oneLine } from '../../lib/lead-utils';

/** Ruta renderizada en servidor: el resto del sitio es estatico. */
export const prerender = false;

const MAX_BODY_BYTES = 12_000;
const isRateLimited = crearLimitador(60_000, 5);

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
  const phoneNumero = clean(data.phone, 40);
  /*
   * El prefijo llega en su propio campo y se comprueba contra la lista en vez de
   * copiarlo tal cual: acaba en el correo, y ahi no se pega texto arbitrario del
   * navegador. Mismo criterio que `config` unas lineas mas abajo.
   *
   * Si no viene (una pestana abierta antes del despliegue, o el formulario de
   * otro sitio), el telefono viaja como siempre.
   */
  const prefijoRecibido = clean(data.phonePrefix, 6);
  const phone = [esPrefijoValido(prefijoRecibido) ? prefijoRecibido : '', phoneNumero]
    .filter(Boolean)
    .join(' ');
  const eventType = clean(data.eventType, 60);
  const message = clean(data.message, 1500);
  const consent = data.consent === true || data.consent === 'on' || data.consent === '1';
  /*
   * El asistente permite elegir varios dias y los manda en este mismo campo
   * separados por comas; los formularios simples siguen mandando uno solo, que
   * aqui es una lista de un elemento. El techo lo pone MAX_BODY_BYTES, no un
   * recorte por caracteres: truncar a medias dejaria una fecha inventada.
   */
  const dates = parsearFechas(clean(data.date, 6_000));
  /* Solo lo manda el asistente de reserva, y se acepta unicamente si es uno de
   * los cuatro ids conocidos: es lo que acaba en el asunto del correo. */
  const configId = clean(data.config, 20);
  const configName = isConfigId(configId) ? configNames[configId] : '';
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  /*
   * Se mide el numero SIN el prefijo. Sobre el concatenado, los digitos de un
   * "+34" contarian para el minimo y colarian un numero de cuatro cifras.
   */
  const phoneValid = phoneNumero.replace(/\D/g, '').length >= 6;

  /*
   * Minimo para poder responder un presupuesto: quien es, como contactarle y de
   * que tipo de evento hablamos. Fecha, invitados, ubicacion y mensaje son
   * opcionales porque muchos leads llegan sin tenerlos decididos.
   */
  if (name.length < 2 || !emailValid || !phoneValid || !eventType || !consent) {
    return json({ ok: false, message: 'Faltan datos obligatorios' }, 422);
  }

  /*
   * La fecha se revalida contra la disponibilidad real de Supabase, no contra lo
   * que diga el navegador: el calendario ya impide elegir dias ocupados, pero
   * una pestana abierta desde hace dias, la cache de 60 s de
   * /api/disponibilidad o una peticion manipulada podrian colarlos. Esta es la
   * unica comprobacion que cuenta.
   *
   * Un dia ocupado se rechaza siempre; la antelacion minima solo se exige a los
   * leads del asistente, porque el formulario simple lleva un <input type=date>
   * libre y ahi una peticion urgente es un lead legitimo, no un error.
   *
   * Con varias fechas basta con que una no valga para rechazar el envio entero:
   * no se puede aceptar media solicitud sin decidir por quien reserva cual de
   * sus dias se queda fuera.
   */
  const dispo = await getDisponibilidad();
  const invalidas = dates.filter((iso) => {
    const estado = estadoFecha(iso, dispo);
    return estado === 'ocupado' || (configName && estado === 'bloqueado');
  });

  if (invalidas.length) {
    return json(
      {
        ok: false,
        message:
          invalidas.length === 1
            ? `El ${formatearFecha(invalidas[0] as string)} ya no está disponible`
            : `Estas fechas ya no están disponibles: ${invalidas.map(formatearFecha).join(', ')}`,
      },
      422,
    );
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
      dates,
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
    // Sin credenciales no se pierde el lead: queda entero en el log del servidor.
    console.warn('[presupuesto] Falta configuracion de email. Lead sin enviar:', JSON.stringify(lead));
    return json({ ok: false, message: 'El envío no está configurado todavía' }, 503);
  }

  const rows: [string, string][] = [
    ['Nombre', lead.customer.name],
    ['Email', lead.customer.email],
    ['Teléfono', lead.customer.phone || '—'],
    ['Tipo de evento', lead.event.type || '—'],
    ['Configuración', lead.event.config || '—'],
    [
      lead.event.dates.length > 1 ? `Fechas (${lead.event.dates.length})` : 'Fecha',
      lead.event.dates.length
        ? lead.event.dates.map(formatearFecha).join(', ')
        : 'Aún no definida',
    ],
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
  /*
   * Con varias fechas van la primera y el recuento: el asunto tiene que caber en
   * la lista de la bandeja, y el detalle esta dos lineas mas abajo en el cuerpo.
   */
  const otras = lead.event.dates.length - 1;
  const asuntoFechas = lead.event.dates.length
    ? `${formatearFecha(lead.event.dates[0] as string)}${
        otras > 0 ? ` +${otras} día${otras > 1 ? 's' : ''}` : ''
      }`
    : 'Fecha por definir';

  const subject = oneLine(
    lead.event.config
      ? `Reserva ${lead.event.config} — ${lead.event.type} — ${asuntoFechas}`
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
    /*
     * El lead entra en el log a proposito. No hay tabla de reservas: el correo es
     * su unico destino, asi que si Resend lo rechaza el log es lo unico que queda
     * para rescatarlo a mano. El precio es que los logs pasan a contener datos
     * personales; ver la nota de docs/leads.md.
     *
     * El motivo va aparte porque es lo que se mira primero: casi siempre es el
     * dominio del remitente sin verificar.
     *
     * El lead va serializado y no como objeto: console.error solo baja dos
     * niveles y dejaba las fechas en un inutil `dates: [Array]`, que es justo el
     * dato por el que se va a mirar el log.
     */
    console.error(
      '[presupuesto] Envio fallido. Lead sin enviar:',
      error instanceof Error ? error.message : error,
      JSON.stringify(lead),
    );
    return json({ ok: false, message: 'No se pudo enviar la solicitud' }, 502);
  }

  return json({ ok: true });
};

export const ALL: APIRoute = () =>
  json({ ok: false, message: 'Método no permitido' }, 405);
