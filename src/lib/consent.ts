/**
 * Contrato del consentimiento de cookies, compartido por las tres piezas que
 * tienen que estar de acuerdo:
 *
 *   1. El script inline de BaseLayout, que fija el estado por defecto de
 *      Consent Mode antes de que cargue Google Tag Manager.
 *   2. El banner (src/components/CookieBanner.astro).
 *   3. El runtime (src/scripts/consent.ts).
 *
 * Si cambian las categorias o el formato de lo que se guarda, sube la version
 * de la clave: los navegadores con la decision antigua volveran a preguntar,
 * que es lo correcto cuando cambia el alcance de lo que se consiente.
 */

/** Clave de localStorage. Versionada a proposito (ver cabecera). */
export const CONSENT_STORAGE_KEY = 'nar-consent-v1';

export type ConsentCategory = 'analytics' | 'maps';

/** Lo que se guarda en localStorage. `date` acredita cuando se consintio. */
export interface ConsentRecord {
  analytics: boolean;
  maps: boolean;
  /** ISO 8601. La AEPD exige poder acreditar el consentimiento. */
  date: string;
}

export interface ConsentCategoryInfo {
  id: ConsentCategory;
  label: string;
  description: string;
}

/**
 * Categorias que el usuario puede conmutar. Las cookies tecnicas no estan
 * aqui: no son opcionales y el banner las describe como necesarias.
 */
export const CONSENT_CATEGORIES: ConsentCategoryInfo[] = [
  {
    id: 'analytics',
    label: 'Analítica',
    description:
      'Google Analytics, para saber qué páginas se visitan y qué secciones funcionan. Los datos se tratan de forma agregada.',
  },
  {
    id: 'maps',
    label: 'Mapa de Google',
    description:
      'Carga el mapa incrustado de la página de contacto. Al mostrarlo, Google recibe tu dirección IP y datos del navegador.',
  },
];

/** Todo denegado: es el estado con el que arranca cualquier visita nueva. */
export const CONSENT_DENIED: Record<ConsentCategory, boolean> = {
  analytics: false,
  maps: false,
};
