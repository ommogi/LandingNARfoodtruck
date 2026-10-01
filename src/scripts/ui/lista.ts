/**
 * Desplegable propio para <select> y para la hora (input type=time).
 * Disparador con aspecto de .field; la lista es un listbox con teclado
 * (flechas, Inicio/Fin, Intro, Escape y busqueda al teclear).
 */

import { abrirPanel, escribirNativo, ICONOS, idUnico, montar, nodo, reflejar, vigilar } from './base';

export interface Opcion {
  valor: string;
  texto: string;
  deshabilitada?: boolean;
}

interface Config {
  el: HTMLInputElement | HTMLSelectElement;
  /** Opciones actuales (se piden cada vez que se abre o se repinta). */
  opciones: () => Opcion[];
  /** Texto cuando no hay valor. */
  vacio: () => string;
  icono?: string;
  /** Opcion a la que hacer scroll al abrir si no hay valor (la hora actual). */
  sugerida?: () => string;
}

export const crearLista = ({ el, opciones, vacio, icono = ICONOS.chevron, sugerida }: Config) => {
  const boton = nodo('button', 'field ui-trigger');
  boton.type = 'button';
  boton.setAttribute('aria-haspopup', 'listbox');
  boton.setAttribute('aria-expanded', 'false');
  // Las clases de tamano del nativo (admin) se conservan en el disparador.
  el.classList.forEach((c) => {
    if (!['field', 'field-select', 'ui-nativo', 'is-invalid'].includes(c)) boton.classList.add(c);
  });
  const texto = nodo('span', 'ui-trigger-texto');
  const ico = nodo('span', 'ui-trigger-icono');
  ico.innerHTML = icono;
  boton.append(texto, ico);
  const etiqueta = el.getAttribute('aria-label') ?? el.closest('label')?.querySelector('.cf-label, span')?.textContent;
  if (etiqueta) boton.setAttribute('aria-label', etiqueta.trim());

  const pintar = () => {
    const actual = opciones().find((o) => o.valor === el.value && el.value !== '');
    texto.textContent = actual?.texto ?? vacio();
    boton.classList.toggle('is-vacio', !actual);
    reflejar(el, boton);
  };

  let cerrar: (() => void) | null = null;

  const abrir = () => {
    if (boton.disabled) return;
    const items = opciones();
    const lista = nodo('ul', 'ui-lista');
    lista.id = idUnico('ui-lista');
    lista.setAttribute('role', 'listbox');
    lista.tabIndex = -1;
    let activa = Math.max(0, items.findIndex((o) => o.valor === el.value));

    items.forEach((o, i) => {
      const li = nodo('li', 'ui-opcion', o.texto);
      li.id = `${lista.id}-${i}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(o.valor === el.value));
      if (o.deshabilitada) li.setAttribute('aria-disabled', 'true');
      li.addEventListener('click', () => elegir(i));
      li.addEventListener('pointermove', () => resaltar(i, false));
      lista.append(li);
    });

    const resaltar = (i: number, scroll = true) => {
      activa = i;
      lista.querySelectorAll('.ui-opcion').forEach((li, n) => li.classList.toggle('is-activa', n === i));
      lista.setAttribute('aria-activedescendant', `${lista.id}-${i}`);
      if (scroll) lista.children[i]?.scrollIntoView({ block: 'nearest' });
    };
    const elegir = (i: number) => {
      const o = items[i];
      if (!o || o.deshabilitada) return;
      cerrar?.();
      boton.focus();
      if (o.valor !== el.value) escribirNativo(el, o.valor);
    };
    const mover = (desde: number, paso: number) => {
      let i = desde;
      for (let n = 0; n < items.length; n += 1) {
        i = (i + paso + items.length) % items.length;
        if (!items[i]?.deshabilitada) return resaltar(i);
      }
    };

    let busqueda = '';
    let reloj = 0;
    lista.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') mover(activa, 1);
      else if (e.key === 'ArrowUp') mover(activa, -1);
      else if (e.key === 'Home') mover(-1, 1);
      else if (e.key === 'End') mover(items.length, -1);
      else if (e.key === 'Enter' || e.key === ' ') elegir(activa);
      else if (e.key === 'Tab') cerrar?.();
      else if (e.key.length === 1) {
        busqueda += e.key.toLowerCase();
        clearTimeout(reloj);
        reloj = window.setTimeout(() => (busqueda = ''), 600);
        // Primero lo que empieza por lo tecleado; si no, lo que lo contiene ("fr" → "+33 FR").
        const t = (o: Opcion) => o.texto.toLowerCase();
        let i = items.findIndex((o) => t(o).startsWith(busqueda));
        if (i < 0) i = items.findIndex((o) => t(o).includes(busqueda));
        if (i >= 0) resaltar(i);
        return;
      } else return;
      e.preventDefault();
    });

    cerrar = abrirPanel(boton, lista, () => (cerrar = null));
    boton.setAttribute('aria-controls', lista.id);
    // Sin valor, la lista arranca en la opcion sugerida (p. ej. la hora actual).
    const inicial = el.value ? activa : Math.max(0, items.findIndex((o) => o.valor === sugerida?.()));
    resaltar(inicial);
    lista.children[inicial]?.scrollIntoView({ block: 'center' });
    lista.focus();
  };

  boton.addEventListener('click', () => (cerrar ? cerrar() : abrir()));
  boton.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
      e.preventDefault();
      abrir();
    }
  });

  montar(el, boton);
  vigilar(el, pintar);
  pintar();
};
