/**
 * Catalogo y precios del configurador desde Supabase. SOLO SERVIDOR.
 *
 * Mismo contrato que disponibilidad-server.ts: nada de aqui lanza. Si la base
 * de datos falla, el catalogo cae a CATALOGO_RESPALDO y el configurador sigue
 * funcionando; lo unico que se pierde son los importes del email, que se marcan
 * como "sin precio" para que el admin lo vea y no reciba un total falso.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  CATALOGO_RESPALDO,
  RENTAL_BASE_ID,
  TEXTOS_PASO_RESPALDO,
  diasFacturables,
  opcionPorId,
  opcionesElegidas,
  type AjustesConfigurador,
  type Catalogo,
  type EstadoConfigurador,
  type Opcion,
  type PasoId,
  type TextosPaso,
  type Unidad,
} from '../data/configurador';
import { createAnonClient } from './supabase';
import { esClaveTexto, esNombreLista, type ItemLista } from '../data/configurador-textos';

type FilaAjustes = {
  precio_desde: number | string;
  texto_incluye: string;
  whatsapp: string;
  pasos: Partial<Record<PasoId, Partial<TextosPaso>>> | null;
  textos?: Record<string, unknown> | null;
  listas?: Record<string, unknown> | null;
};

export type Precio = { precio: number; unidad: Unidad };
export type Precios = Map<string, Precio>;

const COLUMNAS =
  'id, tipo, padre, nombre, descripcion, imagen, icono, etiquetas, categoria, incluido, recomendado_para, visible_para, mostrar_cocina, a_medida, aviso, orden, activo';

/** Mezcla los textos guardados con los de por defecto: un paso vacio no deja un titulo en blanco. */
const mezclarPasos = (guardados: FilaAjustes['pasos']): Record<PasoId, TextosPaso> => {
  const pasos = { ...TEXTOS_PASO_RESPALDO };
  for (const id of Object.keys(pasos) as PasoId[]) {
    const g = guardados?.[id];
    pasos[id] = {
      titulo: g?.titulo?.trim() || pasos[id].titulo,
      subtitulo: g?.subtitulo?.trim() || pasos[id].subtitulo,
    };
  }
  return pasos;
};

/** Solo claves conocidas y valores de texto: lo que venga raro de la base de datos se ignora. */
const limpiarTextos = (raw: Record<string, unknown> | null | undefined): Record<string, string> => {
  const salida: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw ?? {})) {
    if (esClaveTexto(k) && typeof v === 'string' && v.trim()) salida[k] = v;
  }
  return salida;
};

const limpiarListas = (raw: Record<string, unknown> | null | undefined): Catalogo['ajustes']['listas'] => {
  const salida: Catalogo['ajustes']['listas'] = {};
  for (const [k, v] of Object.entries(raw ?? {})) {
    if (!esNombreLista(k) || !Array.isArray(v)) continue;
    salida[k] = v
      .filter((x): x is ItemLista => Boolean(x) && typeof x === 'object' && typeof (x as ItemLista).id === 'string')
      .map((x) => ({
        id: String(x.id),
        nombre: String(x.nombre ?? ''),
        ...(x.descripcion ? { descripcion: String(x.descripcion) } : {}),
        ...(x.icono ? { icono: String(x.icono) } : {}),
        ...(x.oculto ? { oculto: true } : {}),
      }));
  }
  return salida;
};

export const aAjustes = (fila: FilaAjustes | null): AjustesConfigurador => ({
  precioDesde: fila ? Number(fila.precio_desde) : CATALOGO_RESPALDO.ajustes.precioDesde,
  textoIncluye: fila?.texto_incluye || CATALOGO_RESPALDO.ajustes.textoIncluye,
  whatsapp: fila?.whatsapp ?? '',
  pasos: mezclarPasos(fila?.pasos ?? null),
  textos: limpiarTextos(fila?.textos),
  listas: limpiarListas(fila?.listas),
});

/**
 * Catalogo completo, incluidas las opciones inactivas (el admin las necesita;
 * la web las filtra con opcionesDe()). Sin precios.
 */
export const getCatalogo = async (client?: SupabaseClient | null): Promise<Catalogo> => {
  const supabase = client ?? createAnonClient();
  if (!supabase) return CATALOGO_RESPALDO;

  try {
    const [opciones, ajustes] = await Promise.all([
      supabase.from('configurador_opciones').select(COLUMNAS).order('orden'),
      supabase
        .from('configurador_ajustes')
        .select('precio_desde, texto_incluye, whatsapp, pasos, textos, listas')
        .eq('id', 1)
        .maybeSingle(),
    ]);
    if (opciones.error) throw opciones.error;

    const filas = (opciones.data ?? []) as Opcion[];
    // Tabla vacia = migracion sin semilla: mejor el respaldo que un configurador vacio.
    if (!filas.length) return CATALOGO_RESPALDO;

    return { opciones: filas, ajustes: aAjustes((ajustes.data ?? null) as FilaAjustes | null) };
  } catch (error) {
    console.error(
      '[configurador] No se pudo leer el catalogo, se usa el respaldo:',
      error instanceof Error ? error.message : error,
    );
    return CATALOGO_RESPALDO;
  }
};

/**
 * Precios internos via precios_configurador(clave). Devuelve null si no hay
 * clave o la llamada falla: quien llame debe tratarlo como "sin precios", no
 * como precio 0.
 */
export const getPrecios = async (): Promise<Precios | null> => {
  const clave = import.meta.env.CONFIGURADOR_PRICING_SECRET;
  const supabase = createAnonClient();
  if (!clave || !supabase) return null;

  try {
    const { data, error } = await supabase.rpc('precios_configurador', { clave });
    if (error) throw error;
    const filas = (data ?? []) as { opcion_id: string; precio: number | string; unidad: Unidad }[];
    // Clave incorrecta: la funcion no falla, devuelve vacio. Se trata igual que un error.
    if (!filas.length) throw new Error('precios_configurador devolvio 0 filas (¿clave incorrecta?)');
    return new Map(filas.map((f) => [f.opcion_id, { precio: Number(f.precio), unidad: f.unidad }]));
  } catch (error) {
    console.error(
      '[configurador] No se pudieron leer los precios:',
      error instanceof Error ? error.message : error,
    );
    return null;
  }
};

/** Precios con la sesion del admin (RLS los deja pasar). Para el panel. */
export const getPreciosAdmin = async (client: SupabaseClient | null): Promise<Precios> => {
  if (!client) return new Map();
  const { data, error } = await client.from('configurador_precios').select('opcion_id, precio, unidad');
  if (error) {
    console.error('[configurador] Precios del admin:', error.message);
    return new Map();
  }
  return new Map(
    ((data ?? []) as { opcion_id: string; precio: number | string; unidad: Unidad }[]).map((f) => [
      f.opcion_id,
      { precio: Number(f.precio), unidad: f.unidad },
    ]),
  );
};

/* --------------------------------------------------- Presupuesto interno */

export interface LineaPresupuesto {
  id: string;
  concepto: string;
  /** null = la opcion no tiene precio cargado. */
  precio: number | null;
  unidad: Unidad | null;
  /** null = cantidad sin definir (dias o personas por concretar). */
  cantidad: number | null;
  subtotal: number | null;
}

export interface Presupuesto {
  lineas: LineaPresupuesto[];
  total: number;
  /** true si alguna linea no se ha podido sumar: el total es un minimo. */
  incompleto: boolean;
  dias: number | null;
}

const esDeCocina = (opcion: Opcion | null) =>
  opcion?.tipo === 'cocina' || opcion?.tipo === 'cocina_servicio';

/**
 * Desglose interno: rental base x dias + cada opcion elegida segun su unidad.
 *   dia      -> x dias facturables
 *   proyecto -> x 1
 *   persona  -> x personas del servicio (opciones de cocina) o asistentes (resto)
 */
export const presupuestar = (
  estado: EstadoConfigurador,
  catalogo: Catalogo,
  precios: Precios | null,
): Presupuesto => {
  const dias = diasFacturables(estado);
  const personasCocina = estado.cocina.personasNoSe ? null : estado.cocina.personas;
  const asistentes = estado.logistica.asistentesNoSe ? null : estado.logistica.asistentes;

  const cantidadPara = (unidad: Unidad, opcion: Opcion | null) => {
    if (unidad === 'proyecto') return 1;
    if (unidad === 'dia') return dias;
    return (esDeCocina(opcion) ? personasCocina : asistentes) || null;
  };

  const linea = (id: string, concepto: string, opcion: Opcion | null): LineaPresupuesto => {
    const p = precios?.get(id) ?? null;
    if (!p) return { id, concepto, precio: null, unidad: null, cantidad: null, subtotal: null };
    const cantidad = cantidadPara(p.unidad, opcion);
    return {
      id,
      concepto,
      precio: p.precio,
      unidad: p.unidad,
      cantidad,
      subtotal: cantidad === null ? null : Math.round(p.precio * cantidad * 100) / 100,
    };
  };

  const lineas: LineaPresupuesto[] = [linea(RENTAL_BASE_ID, 'FOODD Rental Base', null)];

  for (const id of opcionesElegidas(estado, catalogo)) {
    const opcion = opcionPorId(catalogo, id);
    const padre = opcion?.padre ? opcionPorId(catalogo, opcion.padre) : null;
    const concepto = padre ? `${padre.nombre} · ${opcion?.nombre}` : opcion?.nombre ?? id;
    lineas.push(linea(id, concepto, opcion));
  }

  const total = lineas.reduce((suma, l) => suma + (l.subtotal ?? 0), 0);
  const incompleto = lineas.some((l) => l.subtotal === null && l.precio !== 0);

  return { lineas, total: Math.round(total * 100) / 100, incompleto, dias };
};
