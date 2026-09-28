/**
 * Barra lateral como cajon en movil. En escritorio el CSS la deja fija y estos
 * botones no se ven.
 */

import { onEscape } from '../modal';

export const iniciarCajon = (raiz: HTMLElement) => {
  const side = raiz.querySelector<HTMLElement>('[data-cf-side]');
  const velo = raiz.querySelector<HTMLElement>('[data-cf-side-velo]');
  const abrir = raiz.querySelector<HTMLButtonElement>('[data-cf-side-abrir]');
  const cerrar = raiz.querySelector<HTMLButtonElement>('[data-cf-side-cerrar]');
  if (!side || !abrir) return;

  const poner = (abierto: boolean) => {
    side.classList.toggle('is-abierto', abierto);
    if (velo) velo.hidden = !abierto;
    abrir.setAttribute('aria-expanded', String(abierto));
    document.body.classList.toggle('modal-open', abierto);
    if (abierto) cerrar?.focus();
    else if (document.activeElement && side.contains(document.activeElement)) abrir.focus();
  };

  abrir.addEventListener('click', () => poner(true));
  cerrar?.addEventListener('click', () => poner(false));
  velo?.addEventListener('click', () => poner(false));
  onEscape(() => {
    if (side.classList.contains('is-abierto')) poner(false);
  });
  // Ir a un paso desde el cajon lo cierra.
  side.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('[data-ir]')) poner(false);
  });
};
