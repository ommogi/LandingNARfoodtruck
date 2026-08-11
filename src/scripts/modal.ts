/**
 * Utilidades compartidas por los dialogos de la web (formulario, video y visor
 * de galeria): apertura, cierre, focus trap y analitica.
 *
 * Vive en un modulo unico a proposito: asi solo existe un listener de teclado y
 * un unico dialogo activo, aunque una pagina cargue varios scripts.
 */

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Envia el evento a dataLayer. Nunca incluye datos personales (seccion 10). */
export const track = (event: string, params: Record<string, unknown> = {}) => {
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event, ...params });
};

/** offsetParent es null cuando el elemento (o un ancestro) esta oculto. */
export const isVisible = (el: HTMLElement | null): el is HTMLElement =>
  !!el && el.offsetParent !== null;

const body = document.body;
const menuButton = document.querySelector<HTMLButtonElement>('[data-menu-button]');
const nav = document.querySelector<HTMLElement>('[data-nav]');

let lastFocused: HTMLElement | null = null;
let openDialog: HTMLElement | null = null;

/** Abre o cierra el menu movil. Se exporta porque abrir un modal lo cierra. */
export const setMenu = (open: boolean) => {
  menuButton?.setAttribute('aria-expanded', String(open));
  nav?.classList.toggle('is-open', open);
};

/**
 * Margen tras el que el dialogo se oculta de verdad. Debe ser mayor que los
 * 250ms de la transicion de salida definida en global.css. Se usa un
 * temporizador y no `transitionend` a proposito: la duracion es fija y conocida,
 * y asi el dialogo se cierra igual aunque el navegador no dispare el evento
 * (pestana en segundo plano, movimiento reducido, sin soporte de transiciones).
 */
const CLOSE_MS = 300;

/** Temporizadores de cierre pendientes, por dialogo. */
const closeTimers = new WeakMap<HTMLElement, number>();

export const openModal = (modal: HTMLElement, trigger?: HTMLElement) => {
  // Se guarda el disparador explicito: activeElement no es fiable si la
  // apertura llega desde un click de raton, que no siempre mueve el foco.
  lastFocused = trigger ?? (document.activeElement as HTMLElement);
  openDialog = modal;

  // Reabrir mientras se estaba cerrando: se cancela el ocultado pendiente.
  window.clearTimeout(closeTimers.get(modal));
  closeTimers.delete(modal);

  modal.hidden = false;
  // Un elemento recien mostrado no transiciona desde su estado inicial salvo
  // que el navegador lo haya calculado antes: leer el layout lo fuerza.
  void modal.offsetHeight;
  modal.dataset.state = 'open';

  body.classList.add('modal-open');
  setMenu(false);
  modal.querySelector<HTMLElement>(FOCUSABLE)?.focus();
};

export const closeModal = (modal: HTMLElement) => {
  openDialog = null;
  body.classList.remove('modal-open');

  // El foco vuelve ya, no al terminar la animacion: mientras se funde la salida
  // el dialogo sigue en el DOM y no debe quedar un hueco sin foco.
  // Al abrir el modal se cierra el menu movil, asi que el disparador puede
  // haber quedado oculto: en ese caso se devuelve el foco al boton de menu.
  // Un disparador dentro del propio dialogo que se cierra tampoco vale: sigue
  // visible durante la salida, pero esta a punto de ocultarse.
  const inside = !!lastFocused && modal.contains(lastFocused);

  if (!inside && isVisible(lastFocused)) lastFocused.focus();
  else if (isVisible(menuButton)) menuButton.focus();
  else document.querySelector<HTMLElement>('[data-header] a, [data-header] button')?.focus();

  modal.dataset.state = 'closed';

  const hide = () => {
    // Si se ha vuelto a abrir entretanto, este cierre ya no aplica.
    if (modal.dataset.state === 'open') return;
    modal.hidden = true;
    closeTimers.delete(modal);
  };

  window.clearTimeout(closeTimers.get(modal));
  closeTimers.set(modal, window.setTimeout(hide, CLOSE_MS));
};

export const isOpen = (modal: HTMLElement | null) => !!modal && openDialog === modal;

/** Handlers que cada dialogo registra para responder a Escape. */
const escapeHandlers: (() => void)[] = [];

export const onEscape = (handler: () => void) => {
  escapeHandlers.push(handler);
};

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    setMenu(false);
    escapeHandlers.forEach((handler) => handler());
    return;
  }

  // Focus trap: el tabulador no sale del dialogo abierto.
  if (event.key !== 'Tab' || !openDialog) return;

  const focusables = [...openDialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
  if (focusables.length === 0) return;

  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});
