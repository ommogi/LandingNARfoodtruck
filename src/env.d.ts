/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly RESEND_API_KEY?: string;
  readonly LEAD_FROM_EMAIL?: string;
  readonly LEAD_TO_EMAIL?: string;
  readonly PUBLIC_GA4_ID?: string;
  readonly PUBLIC_SUPABASE_URL?: string;
  readonly PUBLIC_SUPABASE_ANON_KEY?: string;
  /**
   * Clave de Google (Maps JavaScript API + Places API (New)) para el buscador de
   * direcciones del configurador. Publica: restringirla por referente en Google
   * Cloud. Sin ella los campos de direccion son manuales.
   */
  readonly PUBLIC_GOOGLE_MAPS_KEY?: string;
  /** Clave que abre precios_configurador() en Supabase. Solo servidor. */
  readonly CONFIGURADOR_PRICING_SECRET?: string;
  /** Ruta secreta del panel (sin barras). Solo servidor. Ver src/lib/admin.ts. */
  readonly ADMIN_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    /**
     * Cliente de Supabase ligado a la peticion, creado en src/middleware.ts.
     * Es null si faltan las variables de entorno.
     */
    supabase: import('@supabase/supabase-js').SupabaseClient | null;
    /** Email del cliente si hay sesion valida. Vacio si no la hay. */
    userEmail: string;
    /** "/{ADMIN_PATH}" o '' si el panel esta cerrado. */
    adminBase: string;
    /** Marca la segunda pasada del middleware tras reescribir a /admin. */
    adminInterno?: boolean;
  }
}
