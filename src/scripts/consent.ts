/**
 * Consentimiento de cookies: decide que se muestra, guarda la eleccion y
 * avisa a quien depende de ella (Google Consent Mode y el mapa incrustado).
 *
 * El estado por defecto —todo denegado— ya lo fija el script inline de
 * BaseLayout antes de que cargue GTM. Este modulo solo se ocupa de los
 * cambios que hace el usuario.
 *
 * Se carga en todas las paginas, tambien donde no hay GTM: el mapa de Google
 * es contenido de terceros y necesita permiso igualmente.
 */

import {
  CONSENT_CATEGORIES,
  CONSENT_DENIED,
  CONSENT_STORAGE_KEY,
  type ConsentCategory,
  type ConsentRecord,
} from '../lib/consent';
import { closeModal, isOpen, onEscape, openModal, track } from './modal';

declare global {
  interface Window {
    /** La define el script inline de BaseLayout cuando hay GTM. */
    gtag?: (...args: unknown[]) => void;
    /** Reabre el panel. La usa el boton de la politica de cookies. */
    narAbrirPreferencias?: () => void;
  }
}

const banner = document.querySelector<HTMLElement>('[data-consent-banner]');
const modal = document.querySelector<HTMLElement>('[data-consent-modal]');

/* Sin banner no hay nada que gobernar: la pagina no lo ha renderizado. */
if (banner && modal) {
  const toggles = Array.from(
    modal.querySelectorAll<HTMLInputElement>('[data-consent-toggle]'),
  );

  /* --------------------------------------------------- Persistencia */

  const read = (): ConsentRecord | null => {
    try {
      const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<ConsentRecord>;
      // Se normaliza a booleano: un JSON manipulado no debe colar valores raros.
      return {
        analytics: parsed.analytics === true,
        maps: parsed.maps === true,
        date: typeof parsed.date === 'string' ? parsed.date : new Date().toISOString(),
      };
    } catch {
      // localStorage bloqueado o JSON corrupto: se trata como "sin decidir".
      return null;
    }
  };

  const save = (choice: Record<ConsentCategory, boolean>) => {
    const record: ConsentRecord = { ...choice, date: new Date().toISOString() };
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
    } catch {
      // En modo privado la decision no sobrevive a la recarga. Se aplica igual
      // en esta sesion: es preferible a bloquear al usuario.
    }
    return record;
  };

  /* --------------------------------------------------- Efectos */

  /**
   * Traduce las categorias a las senales de Google Consent Mode v2.
   *
   * `analytics_storage` cubre GA4. `functionality_storage` cubre el mapa. Las
   * senales de publicidad se quedan denegadas: hoy no hay ninguna etiqueta de
   * Ads. Si algun dia se anade, hay que ampliar aqui y en el banner, no solo
   * en GTM: el usuario tiene que poder consentirlo de forma informada.
   */
  const applyConsentMode = (choice: Record<ConsentCategory, boolean>) => {
    window.gtag?.('consent', 'update', {
      analytics_storage: choice.analytics ? 'granted' : 'denied',
      functionality_storage: choice.maps ? 'granted' : 'denied',
    });
  };

  /**
   * Carga el mapa solo cuando hay permiso. El iframe se guarda en `data-src`
   * hasta ese momento, el mismo patron perezoso que usa el video en landing.ts.
   *
   * Revocar no descarga lo ya cargado: se vuelve al marcador y se vacia el
   * `src`, que corta la conexion con Google en esa vista.
   */
  const applyMaps = (granted: boolean) => {
    document.querySelectorAll<HTMLElement>('[data-consent="maps"]').forEach((holder) => {
      const frame = holder.querySelector<HTMLIFrameElement>('iframe[data-src]');
      const placeholder = holder.querySelector<HTMLElement>('[data-consent-placeholder]');

      if (frame) {
        if (granted) {
          if (!frame.src) frame.src = frame.dataset.src ?? '';
        } else {
          frame.removeAttribute('src');
        }
        frame.hidden = !granted;
      }

      if (placeholder) placeholder.hidden = granted;
    });
  };

  const apply = (choice: Record<ConsentCategory, boolean>) => {
    applyConsentMode(choice);
    applyMaps(choice.maps);
  };

  /* --------------------------------------------------- Interfaz */

  const showBanner = (visible: boolean) => {
    banner.hidden = !visible;
  };

  const syncToggles = (choice: Record<ConsentCategory, boolean>) => {
    toggles.forEach((input) => {
      const id = input.dataset.consentToggle as ConsentCategory;
      input.checked = choice[id] === true;
    });
  };

  const readToggles = (): Record<ConsentCategory, boolean> => {
    const choice = { ...CONSENT_DENIED };
    toggles.forEach((input) => {
      choice[input.dataset.consentToggle as ConsentCategory] = input.checked;
    });
    return choice;
  };

  const closePanel = () => {
    if (isOpen(modal)) closeModal(modal);
  };

  /** Decide, guarda, aplica y cierra. `origin` solo alimenta la analitica. */
  const decide = (choice: Record<ConsentCategory, boolean>, origin: string) => {
    save(choice);
    apply(choice);
    syncToggles(choice);
    closePanel();
    showBanner(false);

    // Se registra que hubo decision, nunca quien la tomo. Si acepta analitica,
    // GTM recibira este evento; si no, se queda en dataLayer sin salir.
    track('consent_update', {
      origin,
      analytics: choice.analytics,
      maps: choice.maps,
    });
  };

  const acceptAll = () =>
    decide(
      CONSENT_CATEGORIES.reduce(
        (acc, category) => ({ ...acc, [category.id]: true }),
        { ...CONSENT_DENIED },
      ),
      'accept_all',
    );

  const rejectAll = () => decide({ ...CONSENT_DENIED }, 'reject_all');

  /* --------------------------------------------------- Eventos */

  modal.querySelectorAll<HTMLElement>('[data-consent-close]').forEach((el) => {
    el.addEventListener('click', closePanel);
  });

  document.querySelectorAll<HTMLElement>('[data-consent-accept]').forEach((el) => {
    el.addEventListener('click', acceptAll);
  });

  document.querySelectorAll<HTMLElement>('[data-consent-reject]').forEach((el) => {
    el.addEventListener('click', rejectAll);
  });

  modal.querySelectorAll<HTMLElement>('[data-consent-save]').forEach((el) => {
    el.addEventListener('click', () => decide(readToggles(), 'custom'));
  });

  const openPanel = (trigger?: HTMLElement) => {
    syncToggles(read() ?? CONSENT_DENIED);
    openModal(modal, trigger);
  };

  document.querySelectorAll<HTMLElement>('[data-consent-open]').forEach((el) => {
    el.addEventListener('click', () => openPanel(el));
  });

  onEscape(closePanel);

  /* --------------------------------------------------- Arranque */

  const stored = read();

  if (stored) {
    // Ya decidio: se respeta y no se le vuelve a preguntar. Consent Mode ya lo
    // aplico el script inline, pero el mapa depende de este modulo.
    applyMaps(stored.maps);
    syncToggles(stored);
  } else {
    applyMaps(false);
    showBanner(true);
  }

  /* La politica de cookies necesita reabrir el panel desde su propio boton. */
  window.narAbrirPreferencias = () => openPanel();
}

export {};
