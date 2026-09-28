/**
 * Utilidades del panel de gestion. SOLO SERVIDOR.
 *
 * La URL del panel es /{ADMIN_PATH}. ADMIN_PATH es una variable de servidor
 * (no PUBLIC_): no viaja al bundle del navegador ni esta en el repositorio. El
 * navegador solo la conoce porque ya esta en ella; AdminLayout la expone como
 * data-admin-base para que los scripts construyan sus rutas.
 */

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
