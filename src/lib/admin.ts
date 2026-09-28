/**
 * Utilidades del panel de gestion. SOLO SERVIDOR.
 *
 * La URL del panel es /{ADMIN_PATH}. ADMIN_PATH es una variable de servidor
 * (no PUBLIC_): no viaja al bundle del navegador ni esta en el repositorio. El
 * navegador solo la conoce porque ya esta en ella; AdminLayout la expone como
 * data-admin-base para que los scripts construyan sus rutas.
 */

import { createAnonClient } from './supabase';

const ADMIN_PATH_RE = /^[a-z0-9-]{12,64}$/;

let avisado = false;

/** "/gestion-xxxx", o null si la variable falta o no es valida (panel cerrado). */
export const adminBase = (): string | null => {
  const valor = (import.meta.env.ADMIN_PATH ?? '').trim().replace(/^\/+|\/+$/g, '');
  if (ADMIN_PATH_RE.test(valor) && valor !== 'admin') return `/${valor}`;
  if (!avisado) {
    avisado = true;
    console.warn(
      '[admin] ADMIN_PATH falta o no es valida (12-64 caracteres: minusculas, numeros y guiones). El panel queda cerrado.',
    );
  }
  return null;
};

/**
 * Cookie que marca una sesion abierta con el codigo por correo: hasta fijar la
 * contrasena, el middleware solo deja pasar a /clave.
 */
export const COOKIE_CLAVE_PENDIENTE = 'nar-admin-clave';

export const MIN_LARGO_CLAVE = 12;

/** Respuesta JSON del panel: nunca cacheable. */
export const jsonPanel = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  });

/** Espera fija: la respuesta tarda lo mismo acierte o falle la contrasena. */
export const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * ¿Este correo esta en `admins`? Lo pregunta admin_autorizado() (migracion
 * 0006) con la clave de servidor, asi que la anon key sola no sirve para ir
 * probando correos desde fuera.
 *
 * null = no se ha podido saber (sin clave o Supabase caido). Quien llame debe
 * seguir como antes en ese caso: mejor un mensaje neutro que dejar fuera al
 * admin de verdad por un fallo nuestro.
 */
export const esCorreoAutorizado = async (email: string): Promise<boolean | null> => {
  const clave = import.meta.env.CONFIGURADOR_PRICING_SECRET;
  const supabase = createAnonClient();
  if (!clave || !supabase) return null;
  const { data, error } = await supabase.rpc('admin_autorizado', { correo: email, clave });
  if (error) {
    console.warn('[admin] No se pudo comprobar si el correo esta autorizado:', error.message);
    return null;
  }
  return data === true;
};
