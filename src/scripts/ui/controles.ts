/**
 * Sustituye los controles nativos por los propios de la web en toda la pagina,
 * tambien en los que se anaden despues (paradas del Roadshow, filas clonadas de
 * plantillas en el panel). Se importa desde cada punto de entrada; importarlo
 * dos veces no hace nada.
 *
 *   select                → desplegable (ui/selector.ts)
 *   input[type=time]      → lista de horas (ui/hora.ts)
 *   input[type=date]      → calendario (ui/calendario.ts)
 *   input[type=number]    → botones − / + con pulsacion mantenida (ui/numero.ts)
 *
 * `data-nativo` en un control (o en un contenedor) lo deja tal cual.
 */

import { mejorarFecha } from './calendario';
import { mejorarHora } from './hora';
import { mejorarNumero } from './numero';
import { mejorarSelect } from './selector';

const SELECTOR = 'select, input[type="date"], input[type="time"], input[type="number"]';
const hechos = new WeakSet<Element>();

const mejorar = (el: Element) => {
  if (hechos.has(el) || el.closest('[data-nativo], template')) return;
  // Los "hasta" de un periodo los gestiona su "desde".
  if (el instanceof HTMLInputElement && el.type === 'date' && document.querySelector(`[data-dp-hasta="#${el.id}"]`)) {
    hechos.add(el);
    return;
  }
  hechos.add(el);
  if (el instanceof HTMLSelectElement) {
    if (el.multiple) return;
    mejorarSelect(el);
  } else if (el instanceof HTMLInputElement) {
    if (el.type === 'date') mejorarFecha(el);
    else if (el.type === 'time') mejorarHora(el);
    else if (el.type === 'number') mejorarNumero(el);
  }
};

export const mejorarTodo = (raiz: ParentNode = document) => {
  if (raiz instanceof Element && raiz.matches(SELECTOR)) mejorar(raiz);
  raiz.querySelectorAll(SELECTOR).forEach(mejorar);
};

const w = window as unknown as { __narControles?: boolean };
if (!w.__narControles) {
  w.__narControles = true;
  const arrancar = () => {
    mejorarTodo();
    new MutationObserver((cambios) => {
      cambios.forEach((c) =>
        c.addedNodes.forEach((n) => {
          if (n instanceof Element && !n.classList.contains('ui-pop')) mejorarTodo(n);
        }),
      );
    }).observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
}
