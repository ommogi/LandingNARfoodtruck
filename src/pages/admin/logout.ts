/**
 * Cierre de sesion. Solo POST: un GET permitiria que una imagen o un enlace de
 * otra web desconectaran al cliente sin que el lo pidiera.
 */

import type { APIRoute } from 'astro';
import { COOKIE_CLAVE_PENDIENTE } from '../../lib/admin';

export const prerender = false;

export const POST: APIRoute = async ({ locals, redirect, cookies }) => {
  await locals.supabase?.auth.signOut();
  cookies.delete(COOKIE_CLAVE_PENDIENTE, { path: '/' });
  return redirect(`${locals.adminBase}/login`, 302);
};

export const ALL: APIRoute = ({ redirect, locals }) => redirect(locals.adminBase || '/', 302);
