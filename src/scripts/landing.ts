/**
 * Interacciones comunes a todas las paginas: menu movil, modales accesibles,
 * reveal al hacer scroll, alta del formulario y eventos de analitica. Sin
 * librerias externas (seccion 13 de la guia).
 * El foco, el cierre con Escape y dataLayer viven en ./modal; la validacion y el
 * envio del formulario, en ./lead.
 */

import { initLeadForm } from './lead';
import { closeModal, onEscape, openModal, setMenu, track } from './modal';
// Los botones de +/- del campo de invitados. Se importa aqui, que es el script
// que cargan todas las paginas, porque el campo sale en los formularios.
import './stepper';

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

document.querySelectorAll<HTMLElement>('[data-video-open]').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    if (!videoModal || !videoPlayer) return;
    // El archivo solo se descarga cuando el usuario abre el modal.
    if (!videoPlayer.src) videoPlayer.src = videoPlayer.dataset.src ?? '';
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

/* --------------------------------------------------- Cabecera y reveal */

window.addEventListener(
  'scroll',
  () => header?.classList.toggle('is-scrolled', window.scrollY > 24),
  { passive: true },
);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealTargets = document.querySelectorAll<HTMLElement>('[data-reveal]');

if (reduceMotion || !('IntersectionObserver' in window)) {
  revealTargets.forEach((el) => el.classList.add('is-visible'));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12 },
  );
  revealTargets.forEach((el) => observer.observe(el));
}

/* --------------------------------------------------- Analitica de enlaces */

document.querySelectorAll<HTMLElement>('a[data-track]').forEach((el) => {
  el.addEventListener('click', () => track(el.dataset.track as string));
});

/* --------------------------------------------------- Formulario */

document.querySelectorAll<HTMLFormElement>('[data-lead-form]').forEach((form) => initLeadForm(form));

export {};
