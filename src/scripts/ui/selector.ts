/** <select> → desplegable propio. Lee las <option> en cada apertura y repintado. */

import { crearLista, type Opcion } from './lista';

export const mejorarSelect = (el: HTMLSelectElement) => {
  // La opcion vacia de marcador ("Selecciona…") no se lista si el campo es
  // obligatorio o esta deshabilitada: es el texto del disparador mientras no
  // hay valor. En un campo opcional ("Ninguno") si se puede elegir.
  const opciones = (): Opcion[] =>
    [...el.options]
      .filter((o) => o.value !== '' || !(el.required || o.disabled || o.hidden))
      .map((o) => ({ valor: o.value, texto: o.textContent?.trim() ?? o.value, deshabilitada: o.disabled }));
  const vacio = () => [...el.options].find((o) => o.value === '')?.textContent?.trim() || 'Selecciona…';
  crearLista({ el, opciones, vacio });
};
