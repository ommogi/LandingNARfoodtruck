/**
 * Piezas comunes de los controles propios (src/scripts/ui/*).
 *
 * Contrato: el control nativo (<select>, <input type=date|time|number>) se queda
 * en el DOM con su name y sus data-*, oculto a la vista (.ui-nativo) pero vivo
 * para FormData, la validacion y todos los scripts que leen `.value` y escuchan
 * input/change. El control propio solo escribe en el nativo y lanza esos
 * eventos; y cuando un script cambia `.value` por su cuenta, se entera gracias a
 * `vigilar()` y se repinta.
 */

type Nativo = HTMLInputElement | HTMLSelectElement;

/** Escribe como si lo hubiera hecho el usuario: valor + input + change. */
export const escribirNativo = (el: Nativo, valor: string) => {
  el.value = valor;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
};

/**
 * Avisa de cualquier cambio en el nativo: valor puesto por codigo, opciones
 * nuevas, `disabled` o la clase de error que pone lead.ts.
 */
export const vigilar = (el: Nativo, alCambiar: () => void) => {
  let proto: object | null = Object.getPrototypeOf(el);
  let desc: PropertyDescriptor | undefined;
  while (proto && !desc) {
    desc = Object.getOwnPropertyDescriptor(proto, 'value');
    proto = Object.getPrototypeOf(proto);
  }
  if (desc?.set && desc.get) {
    const { get, set } = desc;
    Object.defineProperty(el, 'value', {
      configurable: true,
      get() {
        return get.call(this);
      },
      set(v: string) {
        set.call(this, v);
        alCambiar();
      },
    });
  }
  el.addEventListener('input', alCambiar);
  el.addEventListener('change', alCambiar);
  new MutationObserver(alCambiar).observe(el, {
    attributes: true,
    attributeFilter: ['disabled', 'class', 'min', 'max'],
    childList: true,
    subtree: true,
  });
};

/** Oculta el nativo y deja el control propio justo detras, en su sitio. */
export const montar = (el: Nativo, propio: HTMLElement) => {
  el.classList.add('ui-nativo');
  el.tabIndex = -1;
  el.setAttribute('aria-hidden', 'true');
  el.after(propio);
  // Un <label> envuelve al nativo: su clic (y el foco que da la validacion
  // al fallar) se lleva al control visible.
  el.addEventListener('focus', () => propio.focus());
};

/** Copia el estado visible del nativo al disparador. */
export const reflejar = (el: Nativo, disparador: HTMLElement) => {
  disparador.classList.toggle('is-invalid', el.classList.contains('is-invalid'));
  (disparador as HTMLButtonElement).disabled = el.disabled;
};

/* --------------------------------------------------- Popover */

let cerrarActual: (() => void) | null = null;

/**
 * Abre `panel` anclado a `ancla`. En movil sale como hoja inferior. Se cierra
 * con clic fuera, Escape o al abrir otro. Devuelve la funcion de cierre.
 */
export const abrirPanel = (ancla: HTMLElement, panel: HTMLElement, alCerrar: () => void) => {
  cerrarActual?.();
  const movil = matchMedia('(max-width: 560px)').matches;
  panel.classList.add('ui-pop');
  panel.classList.toggle('is-hoja', movil);
  document.body.append(panel);

  const colocar = () => {
    if (movil) return;
    const r = ancla.getBoundingClientRect();
    const ancho = Math.max(r.width, panel.dataset.anchoMin ? Number(panel.dataset.anchoMin) : 0);
    panel.style.minWidth = `${ancho}px`;
    const alto = panel.offsetHeight;
    const abajo = innerHeight - r.bottom;
    const arriba = abajo < alto + 12 && r.top > abajo;
    panel.style.top = `${arriba ? r.top - alto - 6 : r.bottom + 6}px`;
    panel.style.left = `${Math.max(8, Math.min(r.left, innerWidth - panel.offsetWidth - 8))}px`;
  };
  colocar();

  const fuera = (e: PointerEvent) => {
    if (!panel.contains(e.target as Node) && !ancla.contains(e.target as Node)) cerrar();
  };
  const tecla = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cerrar();
      ancla.focus();
    }
  };
  let velo: HTMLElement | null = null;
  if (movil) {
    velo = document.createElement('div');
    velo.className = 'ui-velo';
    document.body.append(velo);
  }

  const cerrar = () => {
    if (!panel.isConnected) return;
    panel.remove();
    velo?.remove();
    document.removeEventListener('pointerdown', fuera, true);
    document.removeEventListener('keydown', tecla, true);
    removeEventListener('resize', colocar);
    removeEventListener('scroll', colocar, true);
    ancla.setAttribute('aria-expanded', 'false');
    if (cerrarActual === cerrar) cerrarActual = null;
    alCerrar();
  };

  document.addEventListener('pointerdown', fuera, true);
  document.addEventListener('keydown', tecla, true);
  addEventListener('resize', colocar);
  addEventListener('scroll', colocar, true);
  ancla.setAttribute('aria-expanded', 'true');
  cerrarActual = cerrar;
  return cerrar;
};

/** Crea un elemento con clase y texto opcionales. */
export const nodo = <K extends keyof HTMLElementTagNameMap>(tag: K, clase = '', texto?: string) => {
  const el = document.createElement(tag);
  if (clase) el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
};

let contador = 0;
export const idUnico = (prefijo: string) => `${prefijo}-${++contador}`;

/** Iconos en linea (mismo trazo que Lucide). */
export const ICONOS = {
  chevron:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  calendario:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  reloj:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  izquierda:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
  derecha:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
};
