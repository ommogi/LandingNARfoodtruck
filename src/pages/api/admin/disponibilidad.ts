/**
 * Escritura de la disponibilidad desde el panel.
 *
 * Tres barreras, de fuera adentro:
 *   1. src/middleware.ts rechaza con 401 si no hay sesion valida.
 *   2. Esta ruta valida formato y limites antes de tocar nada.
 *   3. Las politicas RLS de Supabase vuelven a comprobar quien escribe, porque
 *      la peticion viaja con la sesion del cliente y no con una clave maestra.
 *
 * Recibe solo lo que ha cambiado:
 *   { cambios: [{ fecha: 'AAAA-MM-DD', estado: 'ocupado' | 'poca' | null }],
 *     ajustes: { minDiasAntelacion: number, mesesVisibles: number } }
 * `estado: null` borra la fila, es decir, libera el dia.
 */

import type { APIRoute } from 'astro';
import { LIMITES, esIsoValido } from '../../../data/disponibilidad';

export const prerender = false;

/** Un rango de dos anos completos cabe de sobra; mas es un error o un abuso. */
const MAX_CAMBIOS = 800;
const MAX_BODY_BYTES = 60_000;

const ESTADOS = ['ocupado', 'poca'] as const;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  });

const enteroEnRango = (value: unknown, { min, max }: { min: number; max: number }) => {
  const numero = Number(value);
  if (!Number.isInteger(numero) || numero < min || numero > max) return null;
  return numero;
};

export const POST: APIRoute = async ({ request, locals }) => {
  const supabase = locals.supabase;
  if (!supabase) return json({ ok: false, message: 'Base de datos no configurada' }, 503);

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json({ ok: false, message: 'Demasiados cambios de golpe' }, 413);

  let body: { cambios?: unknown; ajustes?: unknown };
  try {
    body = JSON.parse(raw || '{}');
  } catch {
    return json({ ok: false, message: 'JSON no válido' }, 400);
  }

  /* ------------------------------------------------ Validacion de fechas */

  const cambios = Array.isArray(body.cambios) ? body.cambios : [];
  if (cambios.length > MAX_CAMBIOS) {
    return json({ ok: false, message: 'Demasiados días en una sola operación' }, 413);
  }

  const aInsertar: { fecha: string; estado: string; updated_at: string }[] = [];
  const aBorrar: string[] = [];
  const vistas = new Set<string>();
  const ahora = new Date().toISOString();

  for (const cambio of cambios) {
    if (!cambio || typeof cambio !== 'object') {
      return json({ ok: false, message: 'Cambio con formato inesperado' }, 422);
    }

    const { fecha, estado } = cambio as { fecha?: unknown; estado?: unknown };

    /* esIsoValido descarta tambien fechas que no existen ('2026-02-31'), que el
       regex solo no atrapa y Postgres rechazaria con un error feo. */
    if (typeof fecha !== 'string' || !esIsoValido(fecha)) {
      return json({ ok: false, message: `Fecha no válida: ${String(fecha)}` }, 422);
    }

    // Dos entradas para el mismo dia dejarian el resultado a merced del orden.
    if (vistas.has(fecha)) {
      return json({ ok: false, message: `Fecha repetida: ${fecha}` }, 422);
    }
    vistas.add(fecha);

    if (estado === null || estado === undefined) {
      aBorrar.push(fecha);
      continue;
    }

    if (typeof estado !== 'string' || !ESTADOS.includes(estado as (typeof ESTADOS)[number])) {
      return json({ ok: false, message: `Estado no válido: ${String(estado)}` }, 422);
    }

    aInsertar.push({ fecha, estado, updated_at: ahora });
  }

  /* ------------------------------------------------ Validacion de ajustes */

  const ajustes = (body.ajustes ?? {}) as Record<string, unknown>;
  const minDias = enteroEnRango(ajustes.minDiasAntelacion, LIMITES.minDiasAntelacion);
  const meses = enteroEnRango(ajustes.mesesVisibles, LIMITES.mesesVisibles);

  if (ajustes.minDiasAntelacion !== undefined && minDias === null) {
    return json(
      {
        ok: false,
        message: `La antelación mínima debe estar entre ${LIMITES.minDiasAntelacion.min} y ${LIMITES.minDiasAntelacion.max} días`,
      },
      422,
    );
  }
  if (ajustes.mesesVisibles !== undefined && meses === null) {
    return json(
      {
        ok: false,
        message: `Los meses visibles deben estar entre ${LIMITES.mesesVisibles.min} y ${LIMITES.mesesVisibles.max}`,
      },
      422,
    );
  }

  /* ------------------------------------------------ Escritura */

  try {
    if (aInsertar.length) {
      const { error } = await supabase
        .from('disponibilidad')
        .upsert(aInsertar, { onConflict: 'fecha' });
      if (error) throw error;
    }

    if (aBorrar.length) {
      const { error } = await supabase.from('disponibilidad').delete().in('fecha', aBorrar);
      if (error) throw error;
    }

    if (minDias !== null || meses !== null) {
      const { error } = await supabase
        .from('ajustes')
        .update({
          ...(minDias !== null && { min_dias_antelacion: minDias }),
          ...(meses !== null && { meses_visibles: meses }),
          updated_at: ahora,
        })
        .eq('id', 1);
      if (error) throw error;
    }
  } catch (error) {
    console.error(
      '[admin] Error al guardar disponibilidad:',
      error instanceof Error ? error.message : error,
    );
    return json({ ok: false, message: 'No se pudo guardar en la base de datos' }, 502);
  }

  return json({ ok: true, guardados: aInsertar.length, liberados: aBorrar.length });
};

export const ALL: APIRoute = () => json({ ok: false, message: 'Método no permitido' }, 405);
