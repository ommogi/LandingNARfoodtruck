/**
 * Disponibilidad publica para el calendario del asistente de reserva.
 *
 * Devuelve exactamente lo que el visitante ya ve pintado en el calendario, asi
 * que no hay nada que ocultar aqui.
 *
 * La respuesta se cachea en el CDN de Vercel: por muchas visitas que haya,
 * Supabase recibe como mucho una consulta por minuto. El precio es que un cambio
 * hecho en /admin tarda hasta 60 s en verse; si eso llega a molestar, bajar
 * `s-maxage`.
 *
 * `max-age=0` es lo que hace que el navegador revalide siempre. Sin el, `public`
 * sin tiempo explicito deja que el navegador aplique su heuristica y se quede
 * con una copia vieja de forma impredecible: el cliente cambia un dia, recarga
 * la web y no ve nada, que es justo el fallo que parece un bug del panel.
 */

import type { APIRoute } from 'astro';
import { getDisponibilidad } from '../../lib/disponibilidad-server';

/** Ruta renderizada en servidor: el resto del sitio es estatico. */
export const prerender = false;

export const GET: APIRoute = async () => {
  const dispo = await getDisponibilidad();

  return new Response(JSON.stringify(dispo), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=120',
    },
  });
};

export const ALL: APIRoute = () =>
  new Response(JSON.stringify({ message: 'Método no permitido' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
