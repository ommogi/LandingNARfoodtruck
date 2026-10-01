/**
 * Visor de las fotos de maquinaria del paso 4. Usa <dialog> nativo: foco
 * atrapado, Escape y fondo los pone el navegador. Clic fuera de la foto cierra.
 */

export const iniciarZoom = (raiz: HTMLElement) => {
  const visor = raiz.querySelector<HTMLDialogElement>('[data-cf-visor]');
  const img = visor?.querySelector<HTMLImageElement>('[data-cf-visor-img]');
  const titulo = visor?.querySelector<HTMLElement>('[data-cf-visor-titulo]');
  if (!visor || !img || !titulo) return;

  raiz.addEventListener('click', (event) => {
    const boton = (event.target as HTMLElement).closest<HTMLElement>('[data-cf-zoom]');
    if (!boton) return;
    img.src = boton.dataset.cfZoom ?? '';
    img.alt = boton.dataset.cfZoomTitulo ?? '';
    titulo.textContent = boton.dataset.cfZoomTitulo ?? '';
    visor.showModal();
  });

  // Clic en el fondo (fuera del contenido) cierra.
  visor.addEventListener('click', (event) => {
    if (event.target === visor) visor.close();
  });
};
