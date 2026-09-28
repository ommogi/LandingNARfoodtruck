/**
 * Rutas del panel en el navegador. La base secreta (/{ADMIN_PATH}) la pone
 * AdminLayout en <body data-admin-base>: el bundle no la lleva escrita.
 *
 *   rutaPanel('')            -> /gestion-xxxx
 *   rutaPanel('/login')      -> /gestion-xxxx/login
 *   rutaPanel('/api/clave')  -> /gestion-xxxx/api/clave
 */
export const rutaPanel = (ruta: string) => `${document.body.dataset.adminBase ?? ''}${ruta}`;
