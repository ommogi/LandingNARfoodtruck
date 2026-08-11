/**
 * Visor de la galeria de la portada. No hay filtros ni "ver mas": el recorrido
 * son las seis fotos, siempre en el mismo orden. La logica del visor es la
 * misma que en /galeria (./lightbox).
 */

import { initLightbox } from './lightbox';

const grid = document.querySelector<HTMLElement>('[data-home-gallery]');

if (grid) {
  initLightbox(
    grid,
    () => [...grid.querySelectorAll<HTMLElement>('[data-lightbox-open]')],
    (index) => ({ gallery: 'home', index }),
  );
}

export {};
