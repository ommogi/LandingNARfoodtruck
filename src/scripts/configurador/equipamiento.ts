/**
 * Paso 4: que tarjetas de "Recomendado" aplican a la subconfiguracion elegida
 * y el filtro (buscador + pestana) de "Todo nuestro equipamiento". Un equipo
 * recomendado sale arriba y se oculta abajo para no duplicarlo.
 */

import { store } from './estado';

export const iniciarEquipamiento = (raiz: HTMLElement) => {
  const buscar = raiz.querySelector<HTMLInputElement>('[data-cf-buscar]');
  const tabs = [...raiz.querySelectorAll<HTMLButtonElement>('[data-cf-cat]')];
  const sinRecomendados = raiz.querySelector<HTMLElement>('[data-cf-sin-recomendados]');
  const sinResultados = raiz.querySelector<HTMLElement>('[data-cf-sin-resultados]');
  let categoria = '';

  const pintar = () => {
    const sub = store.estado.configuracion.sub ?? '';
    const texto = (buscar?.value ?? '').trim().toLowerCase();

    let recomendados = 0;
    raiz.querySelectorAll<HTMLElement>('[data-recomendado-para]').forEach((el) => {
      const aplica = Boolean(sub) && (el.dataset.recomendadoPara ?? '').split(' ').includes(sub);
      el.hidden = !aplica;
      if (aplica) recomendados += 1;
    });
    if (sinRecomendados) sinRecomendados.hidden = recomendados > 0;

    let visibles = 0;
    raiz.querySelectorAll<HTMLElement>('[data-en-catalogo]').forEach((el) => {
      const recomendadoArriba = Boolean(sub) && (el.dataset.enCatalogo ?? '').split(' ').includes(sub);
      const enCategoria = !categoria || el.dataset.categoria === categoria;
      const coincide = !texto || (el.dataset.buscar ?? '').includes(texto);
      el.hidden = recomendadoArriba || !enCategoria || !coincide;
      if (!el.hidden) visibles += 1;
    });
    if (sinResultados) sinResultados.hidden = visibles > 0;

    tabs.forEach((t) => t.setAttribute('aria-pressed', String((t.dataset.cfCat ?? '') === categoria)));
  };

  buscar?.addEventListener('input', pintar);
  tabs.forEach((t) =>
    t.addEventListener('click', () => {
      categoria = t.dataset.cfCat ?? '';
      pintar();
    }),
  );

  return pintar;
};
