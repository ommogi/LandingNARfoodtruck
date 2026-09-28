/**
 * Clientes de Supabase.
 *
 * Solo se usa la clave publica (anon): las escrituras del panel viajan con la
 * sesion del cliente y es RLS quien decide si pasan. No hay service role key en
 * el proyecto a proposito, para que una fuga de codigo no de acceso total.
 *
 * El cliente de servidor guarda la sesion en cookies httpOnly via @supabase/ssr,
 * que es lo que permite a src/middleware.ts proteger /admin antes de renderizar.
 */

import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

export const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
export const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;

/**
 * Sin credenciales el sitio sigue en pie: el calendario cae al fallback y el
 * panel avisa en lugar de reventar. Lo comprueban todos los consumidores.
 */
export const haySupabase = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Cliente anonimo para leer disponibilidad. Sin sesion ni cookies. */
export const createAnonClient = (): SupabaseClient | null => {
  if (!haySupabase()) return null;
  return createServerClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string, {
    auth: { persistSession: false },
    cookies: { getAll: () => [] },
  });
};

/**
 * Cliente ligado a la peticion. Uno nuevo por render: compartirlo entre
 * peticiones mezclaria sesiones de visitantes distintos.
 *
 * `getAll` lee de la cabecera Cookie porque AstroCookies no expone un getAll, y
 * `setAll` escribe con AstroCookies para que el Set-Cookie salga en la respuesta.
 */
export const createRequestClient = (
  request: Request,
  cookies: AstroCookies,
): SupabaseClient | null => {
  if (!haySupabase()) return null;

  return createServerClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string, {
    cookies: {
      getAll: () =>
        parseCookieHeader(request.headers.get('cookie') ?? '').map(({ name, value }) => ({
          name,
          value: value ?? '',
        })),
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) {
          cookies.set(name, value, {
            ...options,
            path: options?.path ?? '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: import.meta.env.PROD,
          });
        }
      },
    },
  });
};
