/**
 * Validacion y envio de los formularios de lead a /api/presupuesto.
 *
 * Vive aparte de ./landing para que el asistente de reserva (./booking) reutilice
 * exactamente la misma validacion, el mismo endpoint y los mismos eventos de
 * analitica, cambiando solo lo que anade al payload y lo que hace al terminar.
 */

import { track } from './modal';

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export interface LeadFormOptions {
  /** Datos que no salen de un <input>, por ejemplo la configuracion elegida. */
  extraData?: () => Record<string, unknown>;
  /** Sustituye al comportamiento por defecto (reset + mensaje de exito). */
  onSuccess?: () => void;
}

export const setFieldValidity = (field: Field) => {
  const valid = field.checkValidity();
  field.classList.toggle('is-invalid', !valid);
  field.setAttribute('aria-invalid', String(!valid));
  return valid;
};

/**
 * Una pagina puede tener mas de un formulario a la vez: en /contacto conviven el
 * de la propia pagina y el del modal que abre "Reservar fecha" del header. Cada
 * uno se inicializa por separado con el [data-form-status] que lleva dentro.
 */
export const initLeadForm = (leadForm: HTMLFormElement, options: LeadFormOptions = {}) => {
  const formStatus = leadForm.querySelector<HTMLElement>('[data-form-status]');
  if (!formStatus) return;

  const fields = () =>
    [...leadForm.querySelectorAll<Field>('input, select, textarea')].filter(
      (field) => field.name !== 'website',
    );

  let started = false;
  leadForm.addEventListener('focusin', () => {
    if (started) return;
    started = true;
    track('form_start');
  });

  leadForm.addEventListener('input', (event) => {
    const target = event.target as Field;
    if (target.name !== 'website') setFieldValidity(target);
  });

  const setStatus = (message: string, state: 'error' | 'success' | '' = '') => {
    formStatus.textContent = message;
    formStatus.classList.toggle('is-error', state === 'error');
    formStatus.classList.toggle('is-success', state === 'success');
  };

  leadForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const allValid = fields().map(setFieldValidity).every(Boolean);
    if (!allValid) {
      setStatus('Revisa los campos marcados.', 'error');
      leadForm.querySelector<HTMLElement>('.is-invalid')?.focus();
      track('form_error', { type: 'client' });
      return;
    }

    // Honeypot relleno: se descarta sin avisar al bot.
    const honeypot = leadForm.elements.namedItem('website') as HTMLInputElement | null;
    if (honeypot?.value) return;

    // El asistente de reserva envia desde un boton type="button" (el mismo que
    // avanza de paso), por eso tambien se acepta [data-form-submit].
    const submit = leadForm.querySelector<HTMLButtonElement>('[type="submit"], [data-form-submit]');
    // Cada formulario tiene su propia etiqueta ("Enviar solicitud", "Solicitar
    // presupuesto"...), asi que se guarda antes de sustituirla.
    const submitLabel = submit?.textContent ?? '';
    if (submit) {
      submit.disabled = true;
      submit.textContent = 'Enviando...';
    }
    setStatus('');
    track('form_submit');

    const data = Object.fromEntries(new FormData(leadForm));

    try {
      const response = await fetch('/api/presupuesto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Cada pagina declara su origen en data-lead-source (ver BaseLayout).
        body: JSON.stringify({
          ...data,
          ...(options.extraData?.() ?? {}),
          source: document.body.dataset.leadSource ?? 'landing-home',
        }),
      });
      const result = (await response.json()) as { ok?: boolean; message?: string };

      if (!response.ok || !result.ok) throw new Error(result.message ?? 'No se pudo enviar');

      track('lead_success');

      if (options.onSuccess) {
        options.onSuccess();
        return;
      }

      leadForm.reset();
      fields().forEach((field) => field.classList.remove('is-invalid'));
      setStatus('Gracias. Hemos recibido tu solicitud y te respondemos en menos de 24 horas.', 'success');
    } catch {
      setStatus('No se ha podido enviar. Escríbenos o inténtalo de nuevo en unos minutos.', 'error');
      track('form_error', { type: 'server' });
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = submitLabel;
      }
    }
  });
};
