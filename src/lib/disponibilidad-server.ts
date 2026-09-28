/**
 * Lectura de la disponibilidad desde Supabase. SOLO SERVIDOR.
 *
 * No importar desde src/scripts/**: arrastraria el SDK de Supabase al bundle del
 * navegador. El navegador se sirve de GET /api/disponibilidad.
 *
 * Regla de oro: esto nunca lanza. Si la base de datos falla se devuelve
 * DISPONIBILIDAD_VACIA, con lo que el calendario se comporta como antes de que
 * existiera la base de datos y /api/presupuesto sigue aceptando leads. Un fallo
 * de Supabase no puede costar un cliente.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { DISPONIBILIDAD_VACIA, toIso, type Disponibilidad } from '../data/disponibilidad';
import { createAnonClient } from './supabase';

type FilaDisponibilidad = { fecha: string; estado: string };
type FilaAjustes = { min_dias_antelacion: number; meses_visibles: number };

/**
 * Fechas anteriores a esta no interesan a nadie: el calendario nunca las
 * muestra. Se filtran en la consulta para que la tabla pueda crecer sin que la
 * respuesta lo haga.
 */
const desdeAyer = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return toIso(date);
};

export const getDisponibilidad = async (
  client?: SupabaseClient | null,
): Promise<Disponibilidad> => {
  const supabase = client ?? createAnonClient();
  if (!supabase) return DISPONIBILIDAD_VACIA;

  try {
    const [fechas, ajustes] = await Promise.all([
      supabase
        .from('disponibilidad')
        .select('fecha, estado')
        .gte('fecha', desdeAyer())
        .order('fecha'),
      supabase.from('ajustes').select('min_dias_antelacion, meses_visibles').eq('id', 1).single(),
    ]);

    if (fechas.error) throw fechas.error;

    const filas = (fechas.data ?? []) as FilaDisponibilidad[];
    const config = (ajustes.data ?? null) as FilaAjustes | null;

    return {
      ocupadas: filas.filter((f) => f.estado === 'ocupado').map((f) => f.fecha),
      poca: filas.filter((f) => f.estado === 'poca').map((f) => f.fecha),
      // Si la fila de ajustes no esta o falla, se sigue con los valores de siempre.
      minDiasAntelacion: config?.min_dias_antelacion ?? DISPONIBILIDAD_VACIA.minDiasAntelacion,
      mesesVisibles: config?.meses_visibles ?? DISPONIBILIDAD_VACIA.mesesVisibles,
    };
  } catch (error) {
    console.error(
      '[disponibilidad] No se pudo leer de Supabase, se usa el fallback:',
      error instanceof Error ? error.message : error,
    );
    return DISPONIBILIDAD_VACIA;
  }
};
