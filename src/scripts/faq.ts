/**
 * Filtros y buscador de /faq. El acordeon se sirve completo desde el servidor:
 * este script solo oculta filas, asi que sin JS la pagina sigue siendo usable.
 * La analitica reutiliza `track` de ./modal, como la galeria.
 */

import { clearEnter, enter } from './enter';
import { track } from './modal';

/** Espera a que el usuario deje de teclear antes de enviar el evento. */
const DEBOUNCE_MS = 250;

/* Minusculas y sin tildes: "logistica" encuentra "logística". */
const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');
const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(DIACRITICS, '');

const list = document.querySelector<HTMLElement>('[data-faq-list]');
const filterBar = document.querySelector<HTMLElement>('[data-faq-filters]');
const search = document.querySelector<HTMLInputElement>('[data-faq-search]');
const clearButton = document.querySelector<HTMLButtonElement>('[data-faq-clear]');
const empty = document.querySelector<HTMLElement>('[data-faq-empty]');
const live = document.querySelector<HTMLElement>('[data-faq-live]');

if (list && filterBar) {
  const cards = [...list.querySelectorAll<HTMLDetailsElement>('.faq-item')];
  const filters = [...filterBar.querySelectorAll<HTMLButtonElement>('[data-filter]')];

  /* El texto buscable se calcula una sola vez: la lista no cambia en cliente. */
  const haystack = new WeakMap<HTMLElement, string>();
  cards.forEach((card) => {
    const question = card.querySelector('.faq-question')?.textContent ?? '';
    const answer = card.querySelector('.faq-answer')?.textContent ?? '';
    haystack.set(card, normalize(`${question} ${answer}`));
  });

  let currentFilter = 'all';
  let query = '';
  /** Preguntas visibles ahora mismo: sirven para saber cuales entran de nuevo. */
  let shown: HTMLDetailsElement[] = [];

  /**
   * Solo entran las preguntas que antes no estaban; las que sobreviven al
   * cambio de filtro se quedan quietas. `animate` va a false en la primera
   * pintura y, sobre todo, al buscar: el buscador repinta en cada pulsacion de
   * tecla y animarlo haria lenta la interaccion mas frecuente de la pagina.
   */
  const render = ({ animate = false } = {}) => {
    const previous = new Set(shown);
    const next: HTMLDetailsElement[] = [];

    cards.forEach((card) => {
      const matchesFilter = currentFilter === 'all' || card.dataset.category === currentFilter;
      const matchesQuery = query === '' || (haystack.get(card) ?? '').includes(query);
      const show = matchesFilter && matchesQuery;

      clearEnter(card);
      card.hidden = !show;
      // Una respuesta abierta que deja de coincidir se pliega: al volver a
      // aparecer lo hace en el mismo estado que el resto de la lista.
      if (!show) card.open = false;
      else next.push(card);
    });

    shown = next;
    if (animate) enter(next.filter((card) => !previous.has(card)), list);

    if (empty) empty.hidden = next.length > 0;
    if (live) {
      live.textContent =
        next.length === 0
          ? 'Ninguna pregunta coincide con la búsqueda'
          : `${next.length} ${next.length === 1 ? 'pregunta visible' : 'preguntas visibles'}`;
    }
    clearButton?.classList.toggle('hidden', query === '');
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
      render({ animate: true });
      track('faq_filter', { filter: currentFilter });
    });
  });

  if (search) {
    let timer: number | undefined;

    const apply = () => {
      query = normalize(search.value.trim());
      render();
    };

    search.addEventListener('input', () => {
      apply();

      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        // Solo se envia la longitud: la consulta puede contener datos personales.
        if (query.length >= 3) track('faq_search', { length: query.length });
      }, DEBOUNCE_MS);
    });

    // Cubre la "x" nativa de los campos type="search".
    search.addEventListener('search', apply);

    clearButton?.addEventListener('click', () => {
      search.value = '';
      apply();
      search.focus();
    });
  }

  render();
}

/**
 * Abre la pregunta enlazada desde fuera (por ejemplo /faq#que-medidas-tiene-el-truck):
 * el navegador salta al elemento pero no expande <details> por si solo.
 */
const openFromHash = () => {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id) return;

  const target = document.getElementById(id);
  if (!(target instanceof HTMLDetailsElement)) return;

  // Si un filtro activo la tenia oculta, se vuelve a "Todas" para mostrarla.
  if (target.hidden) {
    filterBar?.querySelector<HTMLButtonElement>('[data-filter="all"]')?.click();
  }

  // Y si seguia fuera por una busqueda en curso, se vacia el buscador.
  if (target.hidden) clearButton?.click();

  target.open = true;
  target.scrollIntoView({ block: 'center' });
};

window.addEventListener('hashchange', openFromHash);
openFromHash();

export {};
