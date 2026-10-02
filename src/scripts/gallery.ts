/**
 * Galeria de /galeria: filtros por categoria y "ver mas fotos" (secciones 5 y 8
 * de la guia). El visor ampliado lo pone ./lightbox, compartido con la galeria
 * de la portada.
 */

import { repartirFilas } from '../data/gallery';
import { clearEnter, enter } from './enter';
import { initLightbox } from './lightbox';
import { track } from './modal';

/** Fotos visibles al cargar: una fila de dos anchas y dos de tres normales. */
const INITIAL_VISIBLE = 8;
/** Fotos que revela cada pulsacion de "ver mas fotos". */
const STEP = 6;

const grid = document.querySelector<HTMLElement>('[data-gallery-grid]');
const filterBar = document.querySelector<HTMLElement>('[data-gallery-filters]');
const moreButton = document.querySelector<HTMLButtonElement>('[data-gallery-more]');

if (grid && filterBar) {
  const cards = [...grid.querySelectorAll<HTMLElement>('.gallery-card')];
  const filters = [...filterBar.querySelectorAll<HTMLButtonElement>('[data-filter]')];
  const moreWrapper = moreButton?.closest<HTMLElement>('.gallery-more') ?? null;

  let currentFilter = 'all';
  let visibleLimit = INITIAL_VISIBLE;
  /** Fotos mostradas ahora mismo: define tambien el recorrido del visor. */
  let shown: HTMLElement[] = [];

  /* ------------------------------------------------- Filtros y "ver mas" */

  /**
   * Solo entran las fotos que antes no estaban: las que sobreviven al cambio de
   * filtro se quedan quietas, que es lo que deja claro que siguen ahi.
   * `animate: false` en la primera pintura, para no animar al cargar la pagina.
   */
  const render = ({ animate = false } = {}) => {
    const matching = cards.filter(
      (card) => currentFilter === 'all' || card.dataset.category === currentFilter,
    );

    const previous = new Set(shown);

    cards.forEach((card) => {
      card.hidden = true;
      clearEnter(card);
    });

    shown = matching.slice(0, visibleLimit);
    // Anchuras para que todas las filas queden completas con lo que se ve.
    const anchos = repartirFilas(shown.length);
    shown.forEach((card, i) => {
      card.hidden = false;
      card.style.setProperty('--cols', String(anchos[i] ?? 2));
      card.toggleAttribute('data-sola', shown.length % 2 === 1 && i === shown.length - 1);
    });

    if (animate) enter(shown.filter((card) => !previous.has(card)), grid);

    if (moreWrapper) moreWrapper.hidden = matching.length <= visibleLimit;
  };

  filters.forEach((button) => {
    button.addEventListener('click', () => {
      filters.forEach((item) => {
        item.classList.remove('is-active');
        item.setAttribute('aria-pressed', 'false');
      });
      button.classList.add('is-active');
      button.setAttribute('aria-pressed', 'true');

      currentFilter = button.dataset.filter ?? 'all';
      visibleLimit = INITIAL_VISIBLE;
      render({ animate: true });
      track('gallery_filter', { filter: currentFilter });
    });
  });

  moreButton?.addEventListener('click', () => {
    visibleLimit += STEP;
    render({ animate: true });
    track('gallery_load_more', { filter: currentFilter });
    // El foco se queda en el boton; si desaparece se lleva a la ultima foto.
    if (moreWrapper?.hidden) shown[shown.length - 1]?.querySelector('button')?.focus();
  });

  render();

  /* ------------------------------------------------- Visor */

  /* El recorrido son las fotos visibles del filtro activo, en su orden. */
  initLightbox(
    grid,
    () =>
      shown
        .map((card) => card.querySelector<HTMLElement>('[data-lightbox-open]'))
        .filter((trigger): trigger is HTMLElement => trigger !== null),
    (index) => ({ filter: currentFilter, index }),
  );
}

export {};
