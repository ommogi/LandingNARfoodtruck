/**
 * Escritura del catalogo del configurador desde /admin/configurador.
 *
 * Mismas tres barreras que /api/admin/disponibilidad: el middleware exige
 * sesion de admin, esta ruta valida formato y limites, y RLS (es_admin())
 * vuelve a comprobar quien escribe.
 *
 * Cuerpo:
 *   { ajustes: { precioDesde, rentalPrecio, whatsapp, textoIncluye, pasos, textos?, listas? } | null,
 *     opciones: [ { ...Opcion, precio, unidad } ],
 *     borradas: [ id ] }
 */

import type { APIRoute } from 'astro';
import {
  CATEGORIAS_EQUIPO,
  IDS_PROTEGIDOS,
  PASOS,
  RENTAL_BASE_ID,
  TIPO_PADRE,
  TIPOS_OPCION,
  UNIDADES,
  type TipoOpcion,
} from '../../../data/configurador';
import { esIcono } from '../../../components/icons';
import { LISTAS, TEXTOS, esClaveTexto, esNombreLista, type ItemLista } from '../../../data/configurador-textos';
import { clean } from '../../../lib/lead-utils';

export const prerender = false;

const MAX_BODY_BYTES = 600_000;
const MAX_OPCIONES = 400;
const ID_RE = /^[a-z0-9_]+(\.[a-z0-9_]+)*$/;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  });

class Invalido extends Error {}

const texto = (valor: unknown, max: number) => clean(valor, max);

const listaTextos = (valor: unknown, maxItems = 30, maxLen = 60) => {
  if (!Array.isArray(valor)) return [];
  return [...new Set(valor.map((v) => clean(v, maxLen)).filter(Boolean))].slice(0, maxItems);
};

const precioValido = (valor: unknown) => {
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0 || n >= 1_000_000) throw new Invalido('Precio no válido');
  return Math.round(n * 100) / 100;
};

/** Solo rutas propias o URLs https: nada de javascript: ni data: en un src. */
const imagenValida = (valor: unknown) => {
  const s = clean(valor, 500);
  if (!s) return null;
  if (s.startsWith('/') && !s.startsWith('//')) return s;
  try {
    const url = new URL(s);
    if (url.protocol === 'https:') return url.href;
  } catch {
    /* cae al error */
  }
  throw new Invalido(`Imagen no válida: ${s}`);
};

const validarOpcion = (raw: unknown) => {
  if (!raw || typeof raw !== 'object') throw new Invalido('Opción con formato inesperado');
  const o = raw as Record<string, unknown>;

  const id = texto(o.id, 60);
  if (!ID_RE.test(id) || id === RENTAL_BASE_ID) throw new Invalido(`Identificador no válido: ${id || '(vacío)'}`);

  const tipo = texto(o.tipo, 30) as TipoOpcion;
  if (!TIPOS_OPCION.includes(tipo)) throw new Invalido(`Tipo no válido en ${id}`);

  const nombre = texto(o.nombre, 80);
  if (!nombre) throw new Invalido(`Falta el nombre de ${id}`);

  const padre = texto(o.padre, 60) || null;
  if (TIPO_PADRE[tipo] && !padre) throw new Invalido(`Falta el padre de ${id}`);

  const icono = texto(o.icono, 40) || null;
  if (icono && !esIcono(icono)) throw new Invalido(`Icono desconocido en ${id}: ${icono}`);

  const categoria = tipo === 'equipo' ? texto(o.categoria, 30) || 'otros' : null;
  if (categoria && !CATEGORIAS_EQUIPO.some((c) => c.id === categoria)) {
    throw new Invalido(`Categoría no válida en ${id}`);
  }

  const unidad = texto(o.unidad, 10);
  if (!(unidad in UNIDADES)) throw new Invalido(`Unidad no válida en ${id}`);

  return {
    fila: {
      id,
      tipo,
      padre: TIPO_PADRE[tipo] ? padre : null,
      nombre,
      descripcion: texto(o.descripcion, 400),
      imagen: imagenValida(o.imagen),
      icono,
      etiquetas: listaTextos(o.etiquetas, 12, 40),
      categoria,
      incluido: tipo === 'equipo' && o.incluido === true,
      recomendado_para: tipo === 'equipo' ? listaTextos(o.recomendado_para, 60) : [],
      visible_para: listaTextos(o.visible_para, 30),
      mostrar_cocina: tipo === 'uso' && o.mostrar_cocina === true,
      a_medida: o.a_medida === true,
      aviso: texto(o.aviso, 60) || null,
      orden: Math.max(-9999, Math.min(9999, Math.round(Number(o.orden) || 0))),
      activo: o.activo !== false,
    },
    precio: { opcion_id: id, precio: precioValido(o.precio), unidad },
  };
};

const validarAjustes = (raw: unknown) => {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Record<string, unknown>;
  const whatsapp = String(a.whatsapp ?? '').replace(/\D/g, '').slice(0, 15);

  const pasosRaw = (a.pasos ?? {}) as Record<string, { titulo?: unknown; subtitulo?: unknown }>;
  const pasos: Record<string, { titulo: string; subtitulo: string }> = {};
  for (const { id } of PASOS) {
    const p = pasosRaw[id];
    if (p) pasos[id] = { titulo: texto(p.titulo, 120), subtitulo: texto(p.subtitulo, 300) };
  }

  /* Textos: solo claves conocidas. Vacio = se vuelve al texto por defecto. */
  const textos: Record<string, string> = {};
  for (const [k, v] of Object.entries((a.textos ?? {}) as Record<string, unknown>)) {
    if (!esClaveTexto(k)) continue;
    const valor = TEXTOS[k].tipo === 'imagen' ? imagenValida(v) ?? '' : String(v ?? '').replace(/<[^>]*>/g, '').slice(0, 500);
    if (valor.trim()) textos[k] = valor;
  }

  /* Listas: las fijas conservan sus ids; las libres admiten ids nuevos. */
  const listas: Record<string, ItemLista[]> = {};
  for (const [k, v] of Object.entries((a.listas ?? {}) as Record<string, unknown>)) {
    if (!esNombreLista(k) || !Array.isArray(v)) continue;
    const def = LISTAS[k];
    const idsFijos = new Set<string>(def.items.map((x) => x.id));
    const vistos = new Set<string>();
    const items: ItemLista[] = [];
    for (const raw of v.slice(0, 40)) {
      const x = (raw ?? {}) as Record<string, unknown>;
      const id = texto(x.id, 40);
      if (!/^[a-z0-9_]{1,40}$/.test(id) || vistos.has(id)) continue;
      if (def.fija && !idsFijos.has(id)) continue;
      const nombre = texto(x.nombre, 80);
      if (!nombre) throw new Invalido(`Falta el nombre de un elemento de «${def.e}»`);
      const icono = texto(x.icono, 40);
      if (icono && !esIcono(icono)) throw new Invalido(`Icono desconocido en «${def.e}»: ${icono}`);
      vistos.add(id);
      items.push({
        id,
        nombre,
        ...(texto(x.descripcion, 300) ? { descripcion: texto(x.descripcion, 300) } : {}),
        ...(icono ? { icono } : {}),
        ...(x.oculto === true ? { oculto: true } : {}),
      });
    }
    if (!def.fija && !items.length) throw new Invalido(`«${def.e}» necesita al menos un elemento`);
    listas[k] = items;
  }

  return {
    ajustes: {
      precio_desde: precioValido(a.precioDesde),
      texto_incluye: texto(a.textoIncluye, 400),
      whatsapp,
      pasos,
      // Solo se tocan si llegan: la lista completa no los manda y no debe borrarlos.
      ...(a.textos !== undefined ? { textos } : {}),
      ...(a.listas !== undefined ? { listas } : {}),
    },
    rental: { opcion_id: RENTAL_BASE_ID, precio: precioValido(a.rentalPrecio), unidad: 'dia' },
  };
};

export const POST: APIRoute = async ({ request, locals }) => {
  const supabase = locals.supabase;
  if (!supabase) return json({ ok: false, message: 'Base de datos no configurada' }, 503);

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json({ ok: false, message: 'Demasiados cambios de golpe' }, 413);

  let body: { ajustes?: unknown; opciones?: unknown; borradas?: unknown };
  try {
    body = JSON.parse(raw || '{}');
  } catch {
    return json({ ok: false, message: 'JSON no válido' }, 400);
  }

  const opcionesRaw = Array.isArray(body.opciones) ? body.opciones : [];
  if (opcionesRaw.length > MAX_OPCIONES) return json({ ok: false, message: 'Demasiadas opciones' }, 413);

  let opciones: ReturnType<typeof validarOpcion>[];
  let ajustes: ReturnType<typeof validarAjustes>;
  try {
    opciones = opcionesRaw.map(validarOpcion);
    ajustes = validarAjustes(body.ajustes);
  } catch (error) {
    if (error instanceof Invalido) return json({ ok: false, message: error.message }, 422);
    throw error;
  }

  const ids = opciones.map((o) => o.fila.id);
  if (new Set(ids).size !== ids.length) return json({ ok: false, message: 'Hay identificadores repetidos' }, 422);

  const borradas = listaTextos(body.borradas, MAX_OPCIONES).filter((id) => ID_RE.test(id));
  const protegida = borradas.find((id) => (IDS_PROTEGIDOS as readonly string[]).includes(id));
  if (protegida) return json({ ok: false, message: `«${protegida}» no se puede borrar, solo ocultar` }, 422);

  const ahora = new Date().toISOString();

  try {
    if (borradas.length) {
      // Las hijas caen por on delete cascade; sus precios se limpian aqui.
      const { data: hijas } = await supabase.from('configurador_opciones').select('id').in('padre', borradas);
      const todas = [...borradas, ...((hijas ?? []) as { id: string }[]).map((h) => h.id)];
      const { error } = await supabase.from('configurador_opciones').delete().in('id', borradas);
      if (error) throw error;
      const { error: errorPrecios } = await supabase.from('configurador_precios').delete().in('opcion_id', todas);
      if (errorPrecios) throw errorPrecios;
    }

    if (opciones.length) {
      /*
       * Uno a uno por grupo de tipo y no en un solo upsert: una hija nueva cuyo
       * padre tambien es nuevo necesita que el padre exista antes (FK).
       */
      const padres = opciones.filter((o) => !TIPO_PADRE[o.fila.tipo]);
      const hijas = opciones.filter((o) => TIPO_PADRE[o.fila.tipo]);
      for (const grupo of [padres, hijas]) {
        if (!grupo.length) continue;
        const { error } = await supabase
          .from('configurador_opciones')
          .upsert(grupo.map((o) => ({ ...o.fila, updated_at: ahora })), { onConflict: 'id' });
        if (error) throw error;
      }

      const { error } = await supabase
        .from('configurador_precios')
        .upsert(opciones.map((o) => ({ ...o.precio, updated_at: ahora })), { onConflict: 'opcion_id' });
      if (error) throw error;
    }

    if (ajustes) {
      const { error } = await supabase
        .from('configurador_ajustes')
        .upsert({ id: 1, ...ajustes.ajustes, updated_at: ahora }, { onConflict: 'id' });
      if (error) throw error;
      const { error: errorRental } = await supabase
        .from('configurador_precios')
        .upsert({ ...ajustes.rental, updated_at: ahora }, { onConflict: 'opcion_id' });
      if (errorRental) throw errorRental;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : (error as { message?: string })?.message;
    console.error('[admin] Error al guardar el configurador:', message ?? error);
    return json(
      {
        ok: false,
        message: message?.includes('foreign key')
          ? 'Alguna opción apunta a un padre que no existe'
          : 'No se pudo guardar en la base de datos',
      },
      502,
    );
  }

  return json({ ok: true, guardadas: opciones.length, borradas: borradas.length });
};

export const ALL: APIRoute = () => json({ ok: false, message: 'Método no permitido' }, 405);
