/**
 * Envio del configurador (/configurador, paso 10).
 *
 * El navegador manda el estado completo. Aqui:
 *   1. Limite por IP, tamano y honeypot.
 *   2. Se reconstruye el estado campo a campo: cada id se cruza con el catalogo
 *      del servidor (una opcion inventada o desactivada se descarta) y cada
 *      texto se limpia y recorta. Nada del cuerpo pasa tal cual al email.
 *   3. Se exige que los pasos esten completos con la misma funcion que usa el
 *      navegador (faltaEnPaso) y se revalidan las fechas contra Supabase.
 *   4. Se calcula el desglose interno con los precios de configurador_precios.
 *   5. Se envia el email al buzon comercial con Resend.
 *
 * Sin tabla de solicitudes todavia (ver docs/configurador.md): el correo es el
 * unico destino y, si falla, el log conserva la solicitud entera.
 */

import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import {
  PASOS,
  PROVINCIAS,
  UNIDADES,
  esRoadshow,
  estadoInicial,
  faltaEnPaso,
  fechasServicio,
  formatearEuros,
  muestraCocina,
  nombreDe,
  opcionPorId,
  pasosVisibles,
  textoFecha,
  type Catalogo,
  type EstadoConfigurador,
  type Parada,
  type TipoOpcion,
} from '../../data/configurador';
import { esFechaReservable, esIsoValido, formatearFecha } from '../../data/disponibilidad';
import { lista, type NombreLista } from '../../data/configurador-textos';
import { esPrefijoValido } from '../../data/prefijos';
import { getDisponibilidad } from '../../lib/disponibilidad-server';
import { getCatalogo, getPrecios, presupuestar } from '../../lib/configurador-server';
import { EMAIL_RE, clean, crearLimitador, escapeHtml, json, oneLine } from '../../lib/lead-utils';

export const prerender = false;

const MAX_BODY_BYTES = 40_000;
const isRateLimited = crearLimitador(60_000, 4);

/* --------------------------------------------------- Saneado del estado */

type Crudo = Record<string, unknown>;
const obj = (v: unknown): Crudo => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Crudo) : {});
const bool = (v: unknown) => v === true;
const entero = (v: unknown, max = 100_000) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n <= max ? n : null;
};
const iso = (v: unknown) => {
  const s = clean(v, 10);
  return esIsoValido(s) ? s : null;
};
const hora = (v: unknown) => {
  const s = clean(v, 5);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s) ? s : '';
};
const deLista = <T extends string>(v: unknown, permitidos: readonly T[]): T | null => {
  const s = clean(v, 60) as T;
  return permitidos.includes(s) ? s : null;
};

const sanear = (raw: unknown, catalogo: Catalogo): EstadoConfigurador => {
  const activo = (id: unknown, tipo: TipoOpcion, padre?: string | null) => {
    const o = opcionPorId(catalogo, clean(id, 60));
    if (!o || !o.activo || o.tipo !== tipo) return null;
    if (padre !== undefined && o.padre !== padre) return null;
    return o.id;
  };
  const activos = (ids: unknown, tipo: TipoOpcion, max = 40) =>
    (Array.isArray(ids) ? ids : [])
      .slice(0, max)
      .map((id) => activo(id, tipo))
      .filter((id): id is string => Boolean(id))
      .filter((id, i, arr) => arr.indexOf(id) === i);

  /* Ids validos de las listas del catalogo (las visibles: lo oculto no se puede elegir). */
  const ids = (nombre: NombreLista) => lista(catalogo, nombre).map((x) => x.id);

  const r = obj(raw);
  const e = estadoInicial();

  const p = obj(r.proyecto);
  e.proyecto.tipo = activo(p.tipo, 'proyecto');
  e.proyecto.subtipo = e.proyecto.tipo ? activo(p.subtipo, 'subtipo', e.proyecto.tipo) : null;
  e.proyecto.descripcion = clean(p.descripcion, 500);

  const f = obj(r.fecha);
  e.fecha.situacion = deLista(f.situacion, ids('situaciones') as ('known' | 'multiple' | 'unknown')[]);
  e.fecha.modo = deLista(f.modo, ['single', 'range'] as const) ?? 'single';
  e.fecha.inicio = iso(f.inicio);
  e.fecha.fin = e.fecha.modo === 'range' ? iso(f.fin) : null;
  if (e.fecha.inicio && e.fecha.fin && e.fecha.fin < e.fecha.inicio) e.fecha.fin = null;
  e.fecha.alternativas = (Array.isArray(f.alternativas) ? f.alternativas : [])
    .slice(0, 5)
    .map(iso)
    .filter((x): x is string => Boolean(x));
  const elegida = iso(f.elegida);
  e.fecha.elegida = elegida && e.fecha.alternativas.includes(elegida) ? elegida : null;
  const espacios = catalogo.opciones.filter((o) => o.tipo === 'espacio').map((o) => o.id);
  const accesos = catalogo.opciones.filter((o) => o.tipo === 'acceso').map((o) => o.id);
  e.fecha.paradas = (Array.isArray(f.paradas) ? f.paradas : []).slice(0, 12).map((x): Parada => {
    const q = obj(x);
    return {
      ciudad: clean(q.ciudad, 80),
      fecha: iso(q.fecha),
      direccion: clean(q.direccion, 160),
      cp: clean(q.cp, 5),
      inicio: hora(q.inicio),
      fin: hora(q.fin),
      asistentes: entero(q.asistentes),
      espacio: deLista(q.espacio, espacios),
      acceso: deLista(q.acceso, accesos),
      notas: clean(q.notas, 300),
    };
  });

  const c = obj(r.configuracion);
  e.configuracion.uso = activo(c.uso, 'uso');
  e.configuracion.sub = e.configuracion.uso ? activo(c.sub, 'subconfig', e.configuracion.uso) : null;
  e.configuracion.descripcion = clean(c.descripcion, 500);

  const q = obj(r.equipamiento);
  // Los incluidos no se eligen: si llegan, se ignoran.
  e.equipamiento.seleccion = activos(q.seleccion, 'equipo').filter((id) => !opcionPorId(catalogo, id)?.incluido);
  e.equipamiento.otros = clean(q.otros, 500);

  const k = obj(r.cocina);
  e.cocina.opcion = activo(k.opcion, 'cocina');
  e.cocina.servicios = activos(k.servicios, 'cocina_servicio', 20);
  e.cocina.descripcion = clean(k.descripcion, 500);
  e.cocina.personasNoSe = bool(k.personasNoSe);
  e.cocina.personas = e.cocina.personasNoSe ? null : entero(k.personas, 10_000);
  e.cocina.alimentos = deLista(k.alimentos, ids('alimentos'));
  e.cocina.necesidades = (Array.isArray(k.necesidades) ? k.necesidades : [])
    .map((n) => deLista(n, ids('necesidades')))
    .filter((n): n is string => Boolean(n));
  e.cocina.notas = clean(k.notas, 500);

  const a = obj(r.ambientacion);
  e.ambientacion.quiere = typeof a.quiere === 'boolean' ? a.quiere : null;
  e.ambientacion.opcion = activo(a.opcion, 'ambientacion');
  e.ambientacion.descripcion = clean(a.descripcion, 500);
  e.ambientacion.categorias = (Array.isArray(a.categorias) ? a.categorias : [])
    .map((x) => deLista(x, ids('categoriasAmbientacion')))
    .filter((x): x is string => Boolean(x));
  e.ambientacion.personas = deLista(a.personas, ids('personasAmbientacion'));

  const b = obj(r.branding);
  e.branding.quiere = typeof b.quiere === 'boolean' ? b.quiere : null;
  e.branding.tipo = activo(b.tipo, 'branding');
  e.branding.archivos = deLista(b.archivos, ids('archivosBranding'));
  e.branding.marca = clean(b.marca, 80);
  e.branding.descripcion = clean(b.descripcion, 500);

  const l = obj(r.logistica);
  e.logistica.localidad = clean(l.localidad, 80);
  e.logistica.provincia = deLista(l.provincia, PROVINCIAS) ?? '';
  e.logistica.cp = clean(l.cp, 5);
  e.logistica.direccion = clean(l.direccion, 160);
  e.logistica.sinDireccion = bool(l.sinDireccion);
  e.logistica.sinHorario = bool(l.sinHorario);
  e.logistica.inicio = e.logistica.sinHorario ? '' : hora(l.inicio);
  e.logistica.fin = e.logistica.sinHorario ? '' : hora(l.fin);
  e.logistica.asistentesNoSe = bool(l.asistentesNoSe);
  e.logistica.asistentes = e.logistica.asistentesNoSe ? null : entero(l.asistentes);
  e.logistica.espacio = activo(l.espacio, 'espacio');
  e.logistica.acceso = activo(l.acceso, 'acceso');
  e.logistica.modo = activo(l.modo, 'logistica');
  e.logistica.notas = clean(l.notas, 750);

  return e;
};

/* --------------------------------------------------- Email */

const fila = (k: string, v: string | null | undefined) =>
  `<tr><td style="padding:4px 12px 4px 0;color:#5d5d5d;vertical-align:top;white-space:nowrap">${escapeHtml(k)}</td><td style="padding:4px 0">${escapeHtml(v || '—').replace(/\n/g, '<br>')}</td></tr>`;

const seccion = (titulo: string, filas: [string, string | null | undefined][]) =>
  `<h3 style="margin:22px 0 6px;font-size:15px;color:#0a1c26">${escapeHtml(titulo)}</h3><table cellpadding="0" cellspacing="0" style="font-size:14px">${filas
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => fila(k, v))
    .join('')}</table>`;

const generarReferencia = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const n = [...bytes].reduce((acc, b) => acc * 256 + b, 0) % 100_000;
  return `FOODD-${new Date().getFullYear()}-${String(n).padStart(5, '0')}`;
};

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (isRateLimited(clientAddress)) {
    return json({ ok: false, message: 'Demasiadas solicitudes. Inténtalo en unos minutos.' }, 429);
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json({ ok: false, message: 'Solicitud demasiado grande' }, 413);

  let body: Crudo;
  try {
    body = obj(JSON.parse(raw || '{}'));
  } catch {
    return json({ ok: false, message: 'JSON no válido' }, 400);
  }

  if (clean(body.website)) return json({ ok: true, referencia: generarReferencia() });

  /* ------------------------------------------------ Contacto */

  const ct = obj(body.contacto);
  const name = clean(ct.name, 80);
  const company = clean(ct.company, 100);
  const email = clean(ct.email, 160);
  const phoneNumero = clean(ct.phone, 40);
  const prefijo = clean(ct.phonePrefix, 6);
  const phone = [esPrefijoValido(prefijo) ? prefijo : '', phoneNumero].filter(Boolean).join(' ');
  const message = clean(ct.message, 750);
  const consent = ct.consent === true;
  const marketing = ct.marketing === true;

  if (name.length < 2 || !EMAIL_RE.test(email) || phoneNumero.replace(/\D/g, '').length < 6 || !consent) {
    return json({ ok: false, message: 'Faltan datos de contacto obligatorios' }, 422);
  }

  /* ------------------------------------------------ Estado */

  const catalogo = await getCatalogo();
  const estado = sanear(body.estado, catalogo);
  const roadshow = esRoadshow(estado);

  for (const paso of pasosVisibles(estado, catalogo)) {
    if (paso === 'resumen' || paso === 'solicitud') continue;
    const falta = faltaEnPaso(paso, estado, catalogo);
    if (falta) return json({ ok: false, message: `Revisa el paso «${PASOS.find((p) => p.id === paso)?.etiqueta}»: ${falta}.`, paso }, 422);
  }

  const dispo = await getDisponibilidad();
  const invalidas = fechasServicio(estado).filter((f) => !esFechaReservable(f, dispo));
  if (invalidas.length) {
    return json(
      {
        ok: false,
        message: `${invalidas.length === 1 ? 'Esta fecha ya no está disponible' : 'Estas fechas ya no están disponibles'}: ${invalidas.map(formatearFecha).join(', ')}`,
        paso: 'fecha',
      },
      422,
    );
  }

  /* ------------------------------------------------ Presupuesto interno */

  const precios = await getPrecios();
  const presupuesto = presupuestar(estado, catalogo, precios);
  const referencia = generarReferencia();

  const n = (id: string | null | undefined) => nombreDe(catalogo, id, '—');
  const nombreLista = (nombre: NombreLista, id: string | null | undefined) =>
    id ? lista(catalogo, nombre, { conOcultos: true }).find((x) => x.id === id)?.nombre ?? id : undefined;
  const proyectoTxt = [n(estado.proyecto.tipo), estado.proyecto.subtipo && n(estado.proyecto.subtipo)].filter(Boolean).join(' · ');
  const fechaTxt = textoFecha(estado) || 'Por definir';

  const lineasHtml = presupuesto.lineas
    .map((l) => {
      const precio = l.precio === null ? 'sin precio' : `${formatearEuros(l.precio)} ${l.unidad ? UNIDADES[l.unidad] : ''}`;
      const cantidad = l.cantidad === null ? (l.precio === null ? '—' : 'por definir') : `× ${l.cantidad}`;
      const subtotal = l.subtotal === null ? '—' : formatearEuros(l.subtotal);
      return `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee">${escapeHtml(l.concepto)}</td><td style="padding:6px 10px;border-bottom:1px solid #eee">${escapeHtml(precio)}</td><td style="padding:6px 10px;border-bottom:1px solid #eee">${escapeHtml(cantidad)}</td><td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${escapeHtml(subtotal)}</td></tr>`;
    })
    .join('');

  const avisoPrecios = !precios
    ? '<p style="color:#a63921"><strong>No se pudieron leer los precios</strong> (revisa CONFIGURADOR_PRICING_SECRET). El desglose sale sin importes.</p>'
    : presupuesto.incompleto
      ? '<p style="color:#a63921">Hay líneas sin precio o con cantidad por definir (días o personas): el total es un mínimo.</p>'
      : '';

  const desglose = `<h3 style="margin:26px 0 6px;font-size:15px;color:#0a1c26">Desglose interno (no visible para el cliente)</h3>
<table cellpadding="0" cellspacing="0" style="font-size:14px;border-collapse:collapse;min-width:520px">
<tr style="background:#f2eeeb"><th style="padding:6px 10px;text-align:left">Concepto</th><th style="padding:6px 10px;text-align:left">Precio</th><th style="padding:6px 10px;text-align:left">Cantidad</th><th style="padding:6px 10px;text-align:right">Subtotal</th></tr>
${lineasHtml}
<tr><td colspan="3" style="padding:8px 10px;text-align:right"><strong>Total estimado (+ IVA)</strong></td><td style="padding:8px 10px;text-align:right"><strong>${escapeHtml(formatearEuros(presupuesto.total))}</strong></td></tr>
</table>
<p style="font-size:13px;color:#5d5d5d">Días facturables: ${presupuesto.dias ?? 'por definir'}. Logística, desplazamiento e instalación se calculan aparte.</p>
${avisoPrecios}`;

  const e = estado;
  const cocinaVisible = muestraCocina(e, catalogo);
  const secciones = [
    seccion('Cliente', [
      ['Nombre', name],
      ['Empresa', company],
      ['Email', email],
      ['Teléfono', phone],
      ['Comunicaciones comerciales', marketing ? 'Acepta' : 'No'],
      ['Observaciones', message],
    ]),
    seccion('1 · Proyecto', [
      ['Tipo', proyectoTxt],
      ['Descripción', e.proyecto.descripcion || undefined],
    ]),
    seccion('2 · Fecha', roadshow
      ? e.fecha.paradas.map((p, i): [string, string] => [`Parada ${i + 1}`, `${p.ciudad} · ${p.fecha ? formatearFecha(p.fecha) : '—'}`])
      : [
          ['Fecha', fechaTxt],
          ['Fechas posibles', e.fecha.situacion === 'multiple' ? e.fecha.alternativas.map(formatearFecha).join(', ') : undefined],
        ]),
    seccion('3 · Configuración', [
      ['Uso', n(e.configuracion.uso)],
      ['Tipo', n(e.configuracion.sub)],
      ['Descripción', e.configuracion.descripcion || undefined],
    ]),
    seccion('4 · Equipamiento', [
      ['Extras', e.equipamiento.seleccion.map(n).join(', ') || 'Solo equipamiento base'],
      ['Otros', e.equipamiento.otros || undefined],
    ]),
    seccion('5 · Servicio de cocina', !cocinaVisible
      ? [['Servicio', 'No aplica a esta configuración']]
      : [
          ['Modalidad', n(e.cocina.opcion)],
          ...(e.cocina.opcion === 'cocina.cocinero'
            ? ([
                ['Servicios', e.cocina.servicios.map(n).join(', ')],
                ['Qué preparar', e.cocina.descripcion],
                ['Personas', e.cocina.personasNoSe ? 'Por definir' : String(e.cocina.personas ?? '—')],
                ['Alimentos', nombreLista('alimentos', e.cocina.alimentos)],
                ['Necesidades', e.cocina.necesidades.map((x) => nombreLista('necesidades', x)).join(', ') || undefined],
                ['Observaciones', e.cocina.notas || undefined],
              ] as [string, string | undefined][])
            : []),
        ]),
    seccion('6 · Ambientación', e.ambientacion.quiere
      ? [
          ['Ambiente', n(e.ambientacion.opcion)],
          ['Capacidad', nombreLista('personasAmbientacion', e.ambientacion.personas)],
          ['Descripción', e.ambientacion.descripcion || undefined],
          ['Categorías', e.ambientacion.categorias.map((x) => nombreLista('categoriasAmbientacion', x)).join(', ') || undefined],
        ]
      : [['Ambientación', 'Solo FOODD']]),
    seccion('7 · Branding', e.branding.quiere
      ? [
          ['Tipo', n(e.branding.tipo)],
          ['Archivos', nombreLista('archivosBranding', e.branding.archivos)],
          ['Marca', e.branding.marca || undefined],
          ['Descripción', e.branding.descripcion || undefined],
        ]
      : [['Branding', 'Mantener FOODD original']]),
    seccion('8 · Ubicación y logística', roadshow
      ? [
          ['Modalidad', n(e.logistica.modo)],
          ...e.fecha.paradas.map((p, i): [string, string] => [
            `Parada ${i + 1} · ${p.ciudad}`,
            [p.direccion, p.cp, p.inicio && p.fin ? `${p.inicio}–${p.fin}` : 'horario por definir', p.asistentes ? `${p.asistentes} asistentes` : '', p.espacio ? n(p.espacio) : '', p.acceso ? `Acceso: ${n(p.acceso)}` : '', p.notas].filter(Boolean).join(' · '),
          ]),
          ['Observaciones', e.logistica.notas || undefined],
        ]
      : [
          ['Lugar', [e.logistica.direccion || (e.logistica.sinDireccion ? 'Dirección por definir' : ''), e.logistica.cp, e.logistica.localidad, e.logistica.provincia].filter(Boolean).join(', ')],
          ['Horario', e.logistica.sinHorario ? 'Por definir' : `${e.logistica.inicio} – ${e.logistica.fin}`],
          ['Asistentes', e.logistica.asistentesNoSe ? 'Por definir' : String(e.logistica.asistentes ?? '—')],
          ['Espacio', n(e.logistica.espacio)],
          ['Acceso', n(e.logistica.acceso)],
          ['Modalidad', n(e.logistica.modo)],
          ['Observaciones', e.logistica.notas || undefined],
        ]),
  ].join('');

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#171717">
<h2 style="margin:0 0 4px">Nueva solicitud del configurador</h2>
<p style="margin:0;color:#5d5d5d">Referencia de solicitud: <strong>${escapeHtml(referencia)}</strong></p>
${desglose}
${secciones}
</div>`;

  const subject = oneLine(`Solicitud ${referencia} — ${proyectoTxt} — ${fechaTxt}`);

  const solicitud = {
    referencia,
    contacto: { name, company, email, phone, message, marketing },
    estado,
    presupuesto,
    createdAt: new Date().toISOString(),
  };

  const apiKey = import.meta.env.RESEND_API_KEY;
  const from = import.meta.env.LEAD_FROM_EMAIL;
  const to = import.meta.env.LEAD_TO_EMAIL;

  if (!apiKey || !from || !to) {
    console.warn('[configurador] Falta configuracion de email. Solicitud sin enviar:', JSON.stringify(solicitud));
    return json({ ok: false, message: 'El envío no está configurado todavía' }, 503);
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from, to, replyTo: email, subject, html });
    if (error) throw new Error(error.message);
  } catch (error) {
    // Mismo criterio que /api/presupuesto: el log es lo unico que queda. Ver docs/leads.md.
    console.error(
      '[configurador] Envio fallido. Solicitud sin enviar:',
      error instanceof Error ? error.message : error,
      JSON.stringify(solicitud),
    );
    return json({ ok: false, message: 'No se pudo enviar la solicitud' }, 502);
  }

  return json({ ok: true, referencia });
};

export const ALL: APIRoute = () => json({ ok: false, message: 'Método no permitido' }, 405);
