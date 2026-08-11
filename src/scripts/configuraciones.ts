/**
 * Interacciones de /configuraciones: los cuatro modales de ficha.
 *
 * Reutiliza openModal/closeModal/onEscape de ./modal, que ya resuelven el foco,
 * el focus trap y el cierre con Escape. Ese modulo mantiene un unico dialogo
 * abierto a la vez, por eso "Ver plano" cierra la ficha y lleva a la seccion
 * en lugar de apilar un segundo dialogo.
 */

import { closeModal, onEscape, openModal, track } from './modal';

const modals = new Map<string, HTMLElement>();

document.querySelectorAll<HTMLElement>('[data-config-modal]').forEach((modal) => {
  modals.set(modal.dataset.configModal as string, modal);
});

const openConfig = () => [...modals.values()].find((modal) => !modal.hidden) ?? null;

const closeConfig = () => {
  const modal = openConfig();
  if (modal) closeModal(modal);
  return modal;
};

document.querySelectorAll<HTMLElement>('[data-config-open]').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    const id = trigger.dataset.configOpen as string;
    const modal = modals.get(id);
    if (!modal) return;
    openModal(modal, trigger);
    track('config_open', { config: id });
  });
});

document.querySelectorAll<HTMLElement>('[data-config-close]').forEach((el) => {
  el.addEventListener('click', () => closeConfig());
});

onEscape(closeConfig);

/* "Ver plano": cierra la ficha y deja el plano de la pagina a la vista. */
document.querySelectorAll<HTMLElement>('[data-config-plan]').forEach((el) => {
  el.addEventListener('click', () => {
    closeConfig();
    document.querySelector('#distribucion-interior')?.scrollIntoView({ block: 'center' });
    track('config_plan');
  });
});

/*
 * "Seleccionar esta configuracion": cierra la ficha y abre el asistente de
 * reserva con esa configuracion marcada, para que llegue como dato estructurado
 * (acaba en el asunto del correo) y no como texto libre.
 *
 * Se comunica por evento y no llamando a booking.ts para no depender de su
 * estado interno; el que escucha es src/scripts/booking.ts.
 */
document.querySelectorAll<HTMLElement>('[data-config-select]').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    const id = trigger.dataset.configSelect as string;

    closeConfig();
    document.dispatchEvent(
      new CustomEvent('booking:open', { detail: { config: id, step: 1 } }),
    );
    track('config_select', { config: id });
  });
});

export {};
