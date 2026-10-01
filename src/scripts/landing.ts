/**
 * Interacciones comunes a todas las paginas: menu movil, modales accesibles,
 * alta del formulario y eventos de analitica. Las animaciones (GSAP) viven en
 * ./animaciones.
 * El foco, el cierre con Escape y dataLayer viven en ./modal; la validacion y el
 * envio del formulario, en ./lead.
 */

import { initLeadForm } from './lead';
import { closeModal, onEscape, openModal, setMenu, track } from './modal';
// Los botones de +/- del campo de invitados. Se importa aqui, que es el script
// que cargan todas las paginas, porque el campo sale en los formularios.
import './stepper';
import './animaciones';

const header = document.querySelector<HTMLElement>('[data-header]');
const menuButton = document.querySelector<HTMLButtonElement>('[data-menu-button]');
const nav = document.querySelector<HTMLElement>('[data-nav]');

const videoModal = document.querySelector<HTMLElement>('[data-video-modal]');
const videoPlayer = document.querySelector<HTMLVideoElement>('[data-video-player]');

/* --------------------------------------------------- Menu movil */

menuButton?.addEventListener('click', () => {
  setMenu(menuButton.getAttribute('aria-expanded') !== 'true');
});

nav?.addEventListener('click', (event) => {
  if ((event.target as HTMLElement).closest('a')) setMenu(false);
});

/* --------------------------------------------------- Modales */

const closeVideo = () => {
  if (!videoModal || videoModal.hidden) return;
  videoPlayer?.pause();
  closeModal(videoModal);
};

/**
 * Cada disparador dice que video abre (data-video="eventos" | "truck"). Se
 * ofrece WebM (mas ligero) y MP4 de respaldo; el navegador elige el primero
 * que sabe reproducir. El archivo solo se descarga al abrir el modal.
 */
const cargarVideo = (nombre: string) => {
  if (!videoPlayer || videoPlayer.dataset.cargado === nombre) return;
  videoPlayer.replaceChildren(
    ...(['webm', 'mp4'] as const).map((ext) => {
      const source = document.createElement('source');
      source.src = `/video/nar-${nombre}.${ext}`;
      source.type = `video/${ext}`;
      return source;
    }),
  );
  videoPlayer.dataset.cargado = nombre;
  videoPlayer.load();
};

document.querySelectorAll<HTMLElement>('[data-video-open]').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    if (!videoModal || !videoPlayer) return;
    cargarVideo(trigger.dataset.video ?? 'eventos');
    openModal(videoModal, trigger);
    void videoPlayer.play().catch(() => {
      /* El navegador puede bloquear la reproduccion automatica: no es un error. */
    });
    track('video_open');
  });
});

document.querySelectorAll<HTMLElement>('[data-video-close]').forEach((el) => {
  el.addEventListener('click', closeVideo);
});

onEscape(closeVideo);

/* --------------------------------------------------- Cabecera */

window.addEventListener(
  'scroll',
  () => header?.classList.toggle('is-scrolled', window.scrollY > 24),
  { passive: true },
);

/* --------------------------------------------------- Bloques plegables (movil) */

document.querySelectorAll<HTMLButtonElement>('[data-plegable]').forEach((boton) => {
  const bloque = document.getElementById(boton.getAttribute('aria-controls') ?? '');
  if (!bloque) return;
  boton.addEventListener('click', () => {
    const abierto = boton.getAttribute('aria-expanded') !== 'true';
    boton.setAttribute('aria-expanded', String(abierto));
    bloque.classList.toggle('is-abierto', abierto);
    boton.querySelector('svg')?.classList.toggle('rotate-180', abierto);
    if (abierto) {
      // Lo que estaba plegado no llego a entrar con GSAP: se muestra ya y
      // ScrollTrigger recalcula posiciones con el bloque abierto.
      bloque.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
        el.style.visibility = 'visible';
        el.style.opacity = '1';
      });
      window.dispatchEvent(new Event('resize'));
    }
  });
});

/* --------------------------------------------------- Analitica de enlaces */

document.querySelectorAll<HTMLElement>('a[data-track]').forEach((el) => {
  el.addEventListener('click', () => track(el.dataset.track as string));
});

/* --------------------------------------------------- Formulario */

document.querySelectorAll<HTMLFormElement>('[data-lead-form]').forEach((form) => initLeadForm(form));

export {};
