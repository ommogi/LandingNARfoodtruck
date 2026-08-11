/**
 * Entrada de los elementos que aparecen al filtrar una lista: la galeria de
 * /galeria y las preguntas de /faq.
 *
 * Se usa una transicion CSS y no keyframes a proposito: los filtros se pueden
 * pulsar en rafaga y una transicion retoma desde el valor actual, mientras que
 * unos keyframes reiniciarian desde cero y se leerian como un parpadeo.
 *
 * La animacion en si vive en global.css ([data-entering]); aqui solo se marca
 * el estado inicial y se retira. Solo se anima la entrada: la salida tendria
 * que competir con el reflow de la lista, que salta igualmente al cambiar el
 * numero de elementos.
 */

/** Retardo entre elementos de la entrada escalonada. */
const STAGGER_MS = 25;

/** Tope del escalonado: mas alla, el ultimo elemento llegaria tarde. */
const STAGGER_MAX_MS = 150;

/** Borra los restos de una entrada anterior. Se llama al repintar la lista. */
export const clearEnter = (el: HTMLElement) => {
  delete el.dataset.entering;
  el.style.transitionDelay = '';
};

/**
 * Marca `elements` con el estado inicial y lo retira en el mismo fotograma para
 * que el navegador interpole entre los dos.
 *
 * `container` es el elemento cuyo layout se lee para fijar ese estado inicial:
 * sin esa lectura el navegador solo veria el estado final y no habria
 * transicion. El retardo se deja puesto porque la transicion aun no ha
 * empezado; lo limpia el siguiente repintado con clearEnter().
 */
export const enter = (elements: HTMLElement[], container: HTMLElement) => {
  if (elements.length === 0) return;

  elements.forEach((el, i) => {
    el.dataset.entering = '';
    el.style.transitionDelay = `${Math.min(i * STAGGER_MS, STAGGER_MAX_MS)}ms`;
  });

  void container.offsetHeight;

  elements.forEach((el) => {
    delete el.dataset.entering;
  });
};
