/**
 * Visor ampliado, compartido por la galeria de /galeria y la de la portada.
 * El markup vive en components/gallery/Lightbox.astro y el foco, Escape y
 * dataLayer vienen de ./modal, asi que se comporta como el resto de dialogos.
 *
 * `getTriggers` devuelve los disparadores en el orden del recorrido: en
 * /galeria ese orden cambia con los filtros y con "ver mas fotos", en la
 * portada es fijo. Por eso se consulta en cada apertura y en cada salto.
 */

import { closeModal, isOpen, onEscape, openModal, track } from './modal';

type TrackParams = (index: number) => Record<string, unknown>;

/**
 * @param root Contenedor sobre el que se delega el click: los disparadores
 *   pueden aparecer y desaparecer (filtros) sin volver a registrar listeners.
 */
export const initLightbox = (
  root: HTMLElement,
  getTriggers: () => HTMLElement[],
  trackParams: TrackParams = () => ({}),
) => {
  const lightbox = document.querySelector<HTMLElement>('[data-lightbox]');
  const image = document.querySelector<HTMLImageElement>('[data-lightbox-image]');
  const caption = document.querySelector<HTMLElement>('[data-lightbox-caption]');
  const counter = document.querySelector<HTMLElement>('[data-lightbox-counter]');
  const live = document.querySelector<HTMLElement>('[data-lightbox-live]');

  if (!lightbox || !image || !caption || !counter) return;

  let current = 0;

  const show = (next: number) => {
    const triggers = getTriggers();
    if (triggers.length === 0) return;

    // Recorrido circular: de la ultima se pasa a la primera.
    current = (next + triggers.length) % triggers.length;

    const trigger = triggers[current];
    const thumb = trigger.querySelector('img');
    if (!thumb) return;

    // data-full es la version grande generada en build; si falta, se reutiliza
    // la miniatura ya descargada en lugar de dejar el visor en blanco.
    image.src = trigger.dataset.full ?? (thumb.currentSrc || thumb.src);
    image.alt = thumb.alt;
    caption.textContent = thumb.alt;
    counter.textContent = `${current + 1} / ${triggers.length}`;
    if (live) live.textContent = `Foto ${current + 1} de ${triggers.length}`;
  };

  root.addEventListener('click', (event) => {
    const trigger = (event.target as HTMLElement).closest<HTMLElement>('[data-lightbox-open]');
    if (!trigger || !root.contains(trigger)) return;

    const index = getTriggers().indexOf(trigger);
    if (index < 0) return;

    show(index);
    openModal(lightbox, trigger);
    track('lightbox_open', trackParams(index));
  });

  document.querySelectorAll<HTMLElement>('[data-lightbox-close]').forEach((el) => {
    el.addEventListener('click', () => closeModal(lightbox));
  });

  document
    .querySelector<HTMLElement>('[data-lightbox-prev]')
    ?.addEventListener('click', () => show(current - 1));

  document
    .querySelector<HTMLElement>('[data-lightbox-next]')
    ?.addEventListener('click', () => show(current + 1));

  onEscape(() => {
    if (!lightbox.hidden) closeModal(lightbox);
  });

  document.addEventListener('keydown', (event) => {
    if (!isOpen(lightbox)) return;
    if (event.key === 'ArrowLeft') show(current - 1);
    else if (event.key === 'ArrowRight') show(current + 1);
  });
};
