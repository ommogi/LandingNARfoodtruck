/**
 * input type=date → calendario propio con el aspecto del paso 2 del
 * configurador.
 *
 * Atributos opcionales en el input:
 *   data-dp-hasta="#id"        modo periodo: este input es el inicio y el
 *                              indicado el final (queda oculto; un solo
 *                              disparador muestra "14 jun – 18 jun 2026")
 *   data-dp-disponibilidad     pinta disponible/poca/ocupado y no deja elegir
 *                              lo que no es reservable (/api/disponibilidad)
 *   min / max                  limites (ISO)
 */

import {
  DIAS,
  DISPONIBILIDAD_VACIA,
  esFechaReservable,
  estadoFecha,
  esIsoValido,
  fromIso,
  MESES,
  toIso,
  type Disponibilidad,
} from '../../data/disponibilidad';
import { abrirPanel, escribirNativo, ICONOS, montar, nodo, reflejar, vigilar } from './base';

const MESES_CORTOS = MESES.map((m) => m.slice(0, 3).toLowerCase());
const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const corta = (iso: string, conAno = true) => {
  const d = fromIso(iso);
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}${conAno ? ` ${d.getFullYear()}` : ''}`;
};
const larga = (iso: string) => `${DIAS_CORTOS[fromIso(iso).getDay()]} ${corta(iso)}`;

/* La disponibilidad se pide una sola vez por pagina, y solo si algun calendario la usa. */
let dispo: Promise<Disponibilidad> | null = null;
const cargarDispo = () =>
  (dispo ??= fetch('/api/disponibilidad')
    .then((r) => (r.ok ? (r.json() as Promise<Disponibilidad>) : DISPONIBILIDAD_VACIA))
    .catch(() => DISPONIBILIDAD_VACIA));

export const mejorarFecha = (el: HTMLInputElement) => {
  const hasta = el.dataset.dpHasta ? document.querySelector<HTMLInputElement>(el.dataset.dpHasta) : null;
  const conDispo = el.hasAttribute('data-dp-disponibilidad');
  let disponibilidad: Disponibilidad | null = null;
  if (conDispo) void cargarDispo().then((d) => (disponibilidad = d));

  const boton = nodo('button', 'field ui-trigger');
  boton.type = 'button';
  boton.setAttribute('aria-haspopup', 'dialog');
  boton.setAttribute('aria-expanded', 'false');
  el.classList.forEach((c) => {
    if (!['field', 'ui-nativo', 'is-invalid'].includes(c)) boton.classList.add(c);
  });
  const texto = nodo('span', 'ui-trigger-texto');
  const ico = nodo('span', 'ui-trigger-icono');
  ico.innerHTML = ICONOS.calendario;
  boton.append(texto, ico);

  const pintarBoton = () => {
    const a = esIsoValido(el.value) ? el.value : '';
    const b = hasta && esIsoValido(hasta.value) ? hasta.value : '';
    if (hasta) {
      texto.textContent = a && b ? `${corta(a, fromIso(a).getFullYear() !== fromIso(b).getFullYear())} – ${corta(b)}` : a ? `${corta(a)} – …` : 'Elige el periodo';
    } else {
      texto.textContent = a ? larga(a) : 'Elige una fecha';
    }
    boton.classList.toggle('is-vacio', !a);
    reflejar(el, boton);
  };

  let cerrar: (() => void) | null = null;

  const abrir = async () => {
    if (boton.disabled) return;
    if (conDispo) disponibilidad = await cargarDispo();
    const panel = nodo('div', 'ui-cal');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', hasta ? 'Elegir periodo' : 'Elegir fecha');
    panel.dataset.anchoMin = '300';

    const min = esIsoValido(el.min) ? el.min : '';
    const max = esIsoValido(el.max) ? el.max : '';
    // Seleccion en curso (en periodo, la primera pulsacion marca el inicio).
    let inicio = esIsoValido(el.value) ? el.value : '';
    let fin = hasta && esIsoValido(hasta.value) ? hasta.value : '';
    let eligiendoFin = false;
    const base = fromIso(inicio || min || toIso(new Date()));
    let vista = new Date(base.getFullYear(), base.getMonth(), 1);
    let foco = inicio || min || toIso(new Date());

    const cabeza = nodo('div', 'ui-cal-head');
    const prev = nodo('button', 'ui-cal-nav');
    prev.type = 'button';
    prev.innerHTML = ICONOS.izquierda;
    prev.setAttribute('aria-label', 'Mes anterior');
    const titulo = nodo('p', 'ui-cal-mes');
    titulo.setAttribute('aria-live', 'polite');
    const next = nodo('button', 'ui-cal-nav');
    next.type = 'button';
    next.innerHTML = ICONOS.derecha;
    next.setAttribute('aria-label', 'Mes siguiente');
    cabeza.append(prev, titulo, next);

    const dias = nodo('div', 'ui-cal-dias');
    DIAS.forEach((d) => dias.append(nodo('span', '', d.slice(0, 2))));
    const grid = nodo('div', 'ui-cal-grid');
    grid.setAttribute('role', 'grid');
    const pie = nodo('p', 'ui-cal-pie');
    panel.append(cabeza, dias, grid, pie);

    const elegible = (iso: string) =>
      (!min || iso >= min) && (!max || iso <= max) && (!disponibilidad || esFechaReservable(iso, disponibilidad));

    const pintar = () => {
      titulo.textContent = `${MESES[vista.getMonth()]} ${vista.getFullYear()}`;
      const primero = toIso(vista);
      prev.disabled = Boolean(min) && primero.slice(0, 7) <= min.slice(0, 7);
      const ultimoMes = new Date(vista.getFullYear(), vista.getMonth() + 1, 0);
      next.disabled = Boolean(max) && toIso(ultimoMes).slice(0, 7) >= max.slice(0, 7);
      grid.replaceChildren();
      const hueco = (vista.getDay() + 6) % 7;
      for (let i = 0; i < hueco; i += 1) grid.append(nodo('span'));
      for (let d = 1; d <= ultimoMes.getDate(); d += 1) {
        const iso = toIso(new Date(vista.getFullYear(), vista.getMonth(), d));
        const dia = nodo('button', 'ui-dia', String(d));
        dia.type = 'button';
        dia.dataset.dia = iso;
        if (disponibilidad) dia.classList.add(`is-${estadoFecha(iso, disponibilidad)}`);
        dia.disabled = !elegible(iso);
        const sel = iso === inicio || iso === fin;
        dia.classList.toggle('is-sel', sel);
        dia.classList.toggle('is-rango', Boolean(inicio && fin && iso > inicio && iso < fin));
        dia.classList.toggle('is-hoy', iso === toIso(new Date()));
        dia.setAttribute('aria-pressed', String(sel));
        dia.tabIndex = iso === foco ? 0 : -1;
        dia.setAttribute('aria-label', larga(iso));
        grid.append(dia);
      }
      if (!grid.querySelector('[tabindex="0"]')) {
        (grid.querySelector<HTMLButtonElement>('.ui-dia:not(:disabled)') ?? grid.querySelector('.ui-dia'))?.setAttribute('tabindex', '0');
      }
      pie.textContent = hasta
        ? eligiendoFin
          ? 'Ahora elige el último día'
          : inicio && fin
            ? `${corta(inicio)} – ${corta(fin)}`
            : 'Elige el primer día'
        : disponibilidad
          ? 'Los días tachados no están disponibles'
          : '';
      pie.hidden = !pie.textContent;
    };

    const irMes = (delta: number) => {
      vista = new Date(vista.getFullYear(), vista.getMonth() + delta, 1);
      pintar();
    };
    prev.addEventListener('click', () => irMes(-1));
    next.addEventListener('click', () => irMes(1));

    grid.addEventListener('click', (e) => {
      const dia = (e.target as HTMLElement).closest<HTMLButtonElement>('.ui-dia');
      if (!dia || dia.disabled) return;
      const iso = dia.dataset.dia as string;
      foco = iso;
      if (!hasta) {
        cerrar?.();
        boton.focus();
        if (iso !== el.value) escribirNativo(el, iso);
        return;
      }
      if (!eligiendoFin || iso < inicio) {
        inicio = iso;
        fin = '';
        eligiendoFin = true;
        pintar();
        grid.querySelector<HTMLElement>(`[data-dia="${iso}"]`)?.focus();
        return;
      }
      fin = iso;
      eligiendoFin = false;
      cerrar?.();
      boton.focus();
      escribirNativo(el, inicio);
      escribirNativo(hasta, fin);
    });

    grid.addEventListener('keydown', (e) => {
      const dia = (e.target as HTMLElement).closest<HTMLButtonElement>('.ui-dia');
      if (!dia) return;
      const saltos: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
      const salto = saltos[e.key];
      if (salto === undefined) return;
      e.preventDefault();
      const d = fromIso(dia.dataset.dia as string);
      d.setDate(d.getDate() + salto);
      foco = toIso(d);
      if (d.getMonth() !== vista.getMonth() || d.getFullYear() !== vista.getFullYear()) {
        vista = new Date(d.getFullYear(), d.getMonth(), 1);
      }
      pintar();
      grid.querySelector<HTMLElement>(`[data-dia="${foco}"]`)?.focus();
    });

    pintar();
    cerrar = abrirPanel(boton, panel, () => (cerrar = null));
    (grid.querySelector<HTMLElement>('[tabindex="0"]') ?? panel).focus();
  };

  boton.addEventListener('click', () => (cerrar ? cerrar() : void abrir()));

  montar(el, boton);
  vigilar(el, pintarBoton);
  if (hasta) {
    hasta.classList.add('ui-nativo');
    hasta.tabIndex = -1;
    hasta.setAttribute('aria-hidden', 'true');
    // El campo "hasta" queda sin uso visible: se oculta su envoltorio si lo marca.
    hasta.closest<HTMLElement>('[data-dp-ocultar]')?.setAttribute('hidden', '');
    vigilar(hasta, pintarBoton);
  }
  pintarBoton();
};
