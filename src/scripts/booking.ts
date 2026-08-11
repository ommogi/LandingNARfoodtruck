/**
 * Asistente de reserva en cuatro pasos (BookingModal): calendario, navegacion
 * entre pasos y envio.
 *
 * Reutiliza openModal/closeModal/onEscape de ./modal (foco, focus trap, Escape y
 * un unico dialogo abierto) y initLeadForm de ./lead (validacion y envio a
 * /api/presupuesto). Aqui solo vive lo propio del asistente.
 *
 * El calendario se pinta en el navegador y no en el build: el sitio es estatico
 * y un mes renderizado en el despliegue envejeceria con el.
 */

import {
  ESTADO_ETIQUETA,
  ESTADO_TEXTO,
  MESES,
  MESES_VISIBLES,
  estadoFecha,
  formatearFechaLarga,
  toIso,
  type EstadoFecha,
} from '../data/disponibilidad';
import { configNames, isConfigId } from '../data/config-ids';
import { initLeadForm, setFieldValidity } from './lead';
import { closeModal, onEscape, openModal, track } from './modal';

const modal = document.querySelector<HTMLElement>('[data-booking-modal]');
const form = modal?.querySelector<HTMLFormElement>('[data-booking-form]');

if (modal && form) {
  const panel = modal.querySelector<HTMLElement>('[data-modal-panel]');
  const steps = [...form.querySelectorAll<HTMLElement>('[data-step]')];
  const dots = [...modal.querySelectorAll<HTMLElement>('[data-step-dot]')];
  const backButton = form.querySelector<HTMLButtonElement>('[data-booking-back]');
  const nextButton = form.querySelector<HTMLButtonElement>('[data-booking-next]');
  const hint = form.querySelector<HTMLElement>('[data-booking-hint]');
  const recap = form.querySelector<HTMLElement>('[data-booking-recap]');
  const status = form.querySelector<HTMLElement>('[data-form-status]');
  const success = modal.querySelector<HTMLElement>('[data-booking-success]');

  const dateInput = form.querySelector<HTMLInputElement>('[data-booking-date]');
  const noDate = form.querySelector<HTMLInputElement>('[data-booking-nodate]');
  const eventType = form.querySelector<HTMLSelectElement>('[name="eventType"]');

  const grid = form.querySelector<HTMLElement>('[data-cal-grid]');
  const monthSelect = form.querySelector<HTMLSelectElement>('[data-cal-month]');
  const prevButton = form.querySelector<HTMLButtonElement>('[data-cal-prev]');
  const nextMonthButton = form.querySelector<HTMLButtonElement>('[data-cal-next]');

  const summary = {
    date: form.querySelector<HTMLElement>('[data-summary-date]'),
    config: form.querySelector<HTMLElement>('[data-summary-config]'),
    event: form.querySelector<HTMLElement>('[data-summary-event]'),
  };

  const LAST_STEP = steps.length;

  const HINTS: Record<number, string> = {
    1: 'Siguiente paso: detalles del truck',
    2: 'Siguiente paso: datos del evento',
    3: 'Siguiente paso: tus datos de contacto',
    4: 'Te respondemos en menos de 24 horas.',
  };

  let currentStep = 1;

  const setStatus = (message: string, state: 'error' | '' = '') => {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('is-error', state === 'error');
    status.classList.remove('is-success');
  };

  /* --------------------------------------------------- Calendario */

  /** Mes que se esta viendo. Siempre el dia 1, para operar con setMonth(). */
  const view = new Date();
  view.setDate(1);
  view.setHours(0, 0, 0, 0);

  /** Primer y ultimo mes navegables, calculados al cargar la pagina. */
  const firstMonth = new Date(view);
  const lastMonth = new Date(view.getFullYear(), view.getMonth() + MESES_VISIBLES, 1);

  const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

  if (monthSelect) {
    const cursor = new Date(firstMonth);
    while (cursor <= lastMonth) {
      const option = document.createElement('option');
      option.value = monthKey(cursor);
      option.textContent = `${MESES[cursor.getMonth()]} ${cursor.getFullYear()}`;
      monthSelect.append(option);
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  const updateRecap = () => {
    const iso = dateInput?.value ?? '';
    const texto = iso
      ? formatearFechaLarga(iso)
      : noDate?.checked
        ? 'Sin fecha definida'
        : 'Ninguna todavía';

    if (recap) recap.textContent = texto;
    if (summary.date) summary.date.textContent = iso ? formatearFechaLarga(iso) : texto;
  };

  const setSelectedDate = (iso: string) => {
    if (!dateInput) return;
    dateInput.value = iso;

    // Elegir dia y "aun no tengo fecha" se excluyen entre si.
    if (noDate?.checked) noDate.checked = false;

    updateRecap();
    setStatus('');
  };

  /** Celda vacia de los meses vecinos: rellena la semana sin ser seleccionable. */
  const relleno = (day: number) => {
    const cell = document.createElement('span');
    cell.className = 'cal-day is-relleno';
    cell.textContent = String(day);
    cell.setAttribute('aria-hidden', 'true');
    return cell;
  };

  const renderMonth = () => {
    if (!grid) return;
    grid.textContent = '';

    const year = view.getFullYear();
    const month = view.getMonth();
    // getDay() empieza en domingo; el calendario espanol, en lunes.
    const offset = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();

    for (let i = offset; i > 0; i -= 1) grid.append(relleno(daysInPrev - i + 1));

    for (let day = 1; day <= daysInMonth; day += 1) {
      const iso = toIso(new Date(year, month, day));
      const estado: EstadoFecha = estadoFecha(iso);
      const seleccionable = estado === 'disponible' || estado === 'poca';

      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = `cal-day is-${estado}`;
      cell.dataset.day = iso;
      cell.disabled = !seleccionable;
      cell.tabIndex = -1;
      cell.setAttribute(
        'aria-label',
        `${formatearFechaLarga(iso)}. ${ESTADO_TEXTO[estado]}`,
      );

      if (seleccionable) cell.setAttribute('aria-pressed', String(dateInput?.value === iso));
      if (dateInput?.value === iso) cell.classList.add('is-selected');

      const numero = document.createElement('span');
      numero.textContent = String(day);
      const etiqueta = document.createElement('small');
      // Los estados sin rotulo (disponible, bloqueado) los explica el aria-label.
      etiqueta.textContent = ESTADO_ETIQUETA[estado];

      cell.append(numero, etiqueta);
      grid.append(cell);
    }

    const trailing = (7 - ((offset + daysInMonth) % 7)) % 7;
    for (let day = 1; day <= trailing; day += 1) grid.append(relleno(day));

    // Tabulador: una sola parada en la rejilla (el dia elegido o el primero libre).
    const roving =
      grid.querySelector<HTMLButtonElement>('.is-selected') ??
      grid.querySelector<HTMLButtonElement>('button:not(:disabled)');
    if (roving) roving.tabIndex = 0;

    if (monthSelect) monthSelect.value = monthKey(view);
    if (prevButton) prevButton.disabled = view <= firstMonth;
    if (nextMonthButton) nextMonthButton.disabled = view >= lastMonth;
  };

  const moveMonth = (delta: number) => {
    const target = new Date(view.getFullYear(), view.getMonth() + delta, 1);
    if (target < firstMonth || target > lastMonth) return;
    view.setMonth(view.getMonth() + delta);
    renderMonth();
  };

  prevButton?.addEventListener('click', () => moveMonth(-1));
  nextMonthButton?.addEventListener('click', () => moveMonth(1));

  monthSelect?.addEventListener('change', () => {
    const [year, month] = monthSelect.value.split('-').map(Number);
    view.setFullYear(year as number, (month as number) - 1, 1);
    renderMonth();
  });

  grid?.addEventListener('click', (event) => {
    const cell = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-day]');
    if (!cell || cell.disabled) return;

    setSelectedDate(cell.dataset.day as string);
    renderMonth();
    grid.querySelector<HTMLButtonElement>('.is-selected')?.focus();
    track('booking_date', { estado: estadoFecha(cell.dataset.day as string) });
  });

  /** Flechas, Inicio y Fin mueven el foco por la rejilla sin salir del mes. */
  grid?.addEventListener('keydown', (event) => {
    const keys: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    const cells = [...grid.querySelectorAll<HTMLButtonElement>('button[data-day]')];
    const index = cells.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;

    let target = -1;
    if (event.key in keys) target = index + (keys[event.key] as number);
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = cells.length - 1;
    else return;

    event.preventDefault();
    const cell = cells[Math.min(Math.max(target, 0), cells.length - 1)];
    if (!cell) return;
    cells.forEach((el) => (el.tabIndex = -1));
    cell.tabIndex = 0;
    cell.focus();
  });

  noDate?.addEventListener('change', () => {
    if (noDate.checked && dateInput) {
      dateInput.value = '';
      renderMonth();
    }
    updateRecap();
    setStatus('');
  });

  /* --------------------------------------------------- Pasos */

  const stepFields = (step: number) =>
    [
      ...(steps[step - 1]?.querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >('input, select, textarea') ?? []),
    ].filter((field) => field.name !== 'website');

  const validateStep = (step: number) => {
    // El paso 1 no tiene campos con required: la fecha es un input oculto.
    if (step === 1 && !dateInput?.value && !noDate?.checked) {
      setStatus('Elige una fecha o marca que aún no la tienes definida.', 'error');
      return false;
    }

    const invalid = stepFields(step).filter((field) => !setFieldValidity(field));
    if (invalid.length === 0) return true;

    setStatus('Revisa los campos marcados.', 'error');
    invalid[0]?.focus();
    return false;
  };

  const updateSummary = () => {
    const config = form.querySelector<HTMLInputElement>('[name="config"]:checked');
    const configId = config?.value ?? '';

    if (summary.config) {
      summary.config.textContent = isConfigId(configId) ? configNames[configId] : '—';
    }
    if (summary.event) summary.event.textContent = eventType?.value || '—';
    updateRecap();
  };

  const goToStep = (step: number, silent = false) => {
    currentStep = Math.min(Math.max(step, 1), LAST_STEP);

    steps.forEach((section, index) => {
      section.hidden = index + 1 !== currentStep;
    });
    dots.forEach((dot) => {
      const active = Number(dot.dataset.stepDot) === currentStep;
      dot.classList.toggle('is-active', active);
      if (active) dot.setAttribute('aria-current', 'step');
      else dot.removeAttribute('aria-current');
    });

    if (backButton) backButton.hidden = currentStep === 1;
    if (nextButton) {
      nextButton.textContent = currentStep === LAST_STEP ? 'Enviar solicitud' : 'Continuar';
    }
    if (hint) hint.textContent = HINTS[currentStep] ?? '';

    if (currentStep === LAST_STEP) updateSummary();

    setStatus('');
    if (panel) panel.scrollTop = 0;
    if (!silent) track('booking_step', { step: currentStep });
  };

  nextButton?.addEventListener('click', () => {
    if (!validateStep(currentStep)) return;

    if (currentStep < LAST_STEP) {
      goToStep(currentStep + 1);
      steps[currentStep - 1]?.querySelector<HTMLElement>('input, select, textarea')?.focus();
      return;
    }

    // Ultimo paso: se revalidan todos por si se manipulo el DOM o se volvio atras.
    for (let step = 1; step <= LAST_STEP; step += 1) {
      if (validateStep(step)) continue;
      goToStep(step);
      validateStep(step);
      return;
    }

    form.requestSubmit();
  });

  backButton?.addEventListener('click', () => goToStep(currentStep - 1));

  /* Enter en un campo avanza de paso en lugar de enviar a medias. */
  form.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    const target = event.target as HTMLElement;
    if (target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || target.tagName === 'A') {
      return;
    }
    event.preventDefault();
    nextButton?.click();
  });

  form.addEventListener('change', (event) => {
    const target = event.target as HTMLElement;
    if (target.matches('[name="config"]')) {
      track('booking_config', { config: (target as HTMLInputElement).value });
    }
  });

  /* --------------------------------------------------- Apertura y envio */

  const reset = () => {
    form.reset();
    if (dateInput) dateInput.value = '';
    form
      .querySelectorAll('.is-invalid')
      .forEach((field) => field.classList.remove('is-invalid'));
    view.setFullYear(firstMonth.getFullYear(), firstMonth.getMonth(), 1);
    renderMonth();
    goToStep(1, true);
  };

  const open = (trigger?: HTMLElement, options: { config?: string; step?: number } = {}) => {
    // Tras un envio correcto el formulario esta oculto: se vuelve a empezar.
    if (success && !success.classList.contains('hidden')) {
      success.classList.add('hidden');
      form.hidden = false;
      reset();
    }

    if (options.config && isConfigId(options.config)) {
      const radio = form.querySelector<HTMLInputElement>(
        `[name="config"][value="${options.config}"]`,
      );
      if (radio) radio.checked = true;
    }

    goToStep(options.step ?? currentStep);
    openModal(modal, trigger);
  };

  document.querySelectorAll<HTMLElement>('[data-booking-open]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      open(trigger, { config: trigger.dataset.bookingConfig });
      track(trigger.dataset.track ?? 'booking_open');
    });
  });

  /*
   * "Seleccionar esta configuracion" de /configuraciones abre el asistente por
   * evento para no tener que conocer su estado interno (ver ./configuraciones).
   */
  document.addEventListener('booking:open', (event) => {
    const detail = (event as CustomEvent<{ config?: string; step?: number }>).detail ?? {};
    open(undefined, detail);
  });

  document.querySelectorAll<HTMLElement>('[data-booking-close]').forEach((el) => {
    el.addEventListener('click', () => closeModal(modal));
  });

  onEscape(() => {
    if (!modal.hidden) closeModal(modal);
  });

  initLeadForm(form, {
    extraData: () => ({ config: form.querySelector<HTMLInputElement>('[name="config"]:checked')?.value ?? '' }),
    onSuccess: () => {
      form.hidden = true;
      success?.classList.remove('hidden');
      success?.setAttribute('tabindex', '-1');
      success?.focus();
    },
  });

  renderMonth();
  goToStep(1, true);
}

export {};
