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
  /**
   * Ambito del boton apagado. Por defecto mira todo el formulario; el asistente
   * pasa el suyo para mirar solo el paso actual.
   */
  gate?: Partial<SubmitGateOptions>;
}

export const setFieldValidity = (field: Field) => {
  const valid = field.checkValidity();
  field.classList.toggle('is-invalid', !valid);
  field.setAttribute('aria-invalid', String(!valid));
  return valid;
};

/**
 * Rotulo legible de un campo, para poder decir que falta sin soltar el `name`
 * crudo a quien esta rellenando el formulario.
 */
export const nombreCampo = (field: Field) => {
  if (field.dataset.label) return field.dataset.label;

  const enFieldset = field.closest('fieldset')?.querySelector('legend')?.textContent;

  /*
   * Los radios van primero al <legend>. Cada uno tiene su propio <label>, que en
   * el asistente es la tarjeta entera de la configuracion —nombre, precio y
   * descripcion—, y ademas al no haber ninguno marcado fallan los cuatro. Por el
   * <legend> el grupo se nombra una sola vez y como lo que es.
   */
  if (field instanceof HTMLInputElement && field.type === 'radio' && enFieldset) {
    return enFieldset.trim().toLowerCase();
  }

  const enLabel = field.closest('label')?.querySelector('span')?.textContent;
  // El asterisco de obligatorio vive dentro del <span>, y aqui sobra.
  if (enLabel) return enLabel.replace('*', '').trim().toLowerCase();

  if (enFieldset) return enFieldset.trim().toLowerCase();

  return field.name;
};

/** Cuantos campos se nombran antes de resumir el resto en un contador. */
const MAX_NOMBRES = 3;

export interface SubmitGateOptions {
  /** Campos a mirar. El asistente pasa solo los del paso actual. */
  campos: () => Field[];
  /** Condicion que no se puede expresar con checkValidity() (las fechas). */
  extraOk?: () => boolean;
  /** Como se llama lo que pide `extraOk`, para poder nombrarlo en el aviso. */
  extraLabel?: string;
  boton: HTMLButtonElement | null;
  aviso: HTMLElement | null;
  /** Texto del aviso cuando no falta nada. */
  textoOk?: () => string;
}

/**
 * Apaga el boton mientras falte algo obligatorio, y dice el que.
 *
 * Se apaga con aria-disabled y no con el atributo `disabled`, a proposito:
 *
 *   - Un boton con `disabled` no es enfocable y los lectores de pantalla lo
 *     saltan, asi que quien navega a ciegas no encuentra ni el boton ni el
 *     motivo por el que no puede seguir.
 *   - El asistente hace Enter -> nextButton.click() (ver ./booking), y un boton
 *     `disabled` ignora .click(): pulsar Enter no haria nada, en silencio.
 *
 * Asi se ve y se comporta como apagado —no envia— pero al pulsarlo sigue
 * saltando la validacion de siempre, que resalta el campo y le lleva el foco.
 */
export const initSubmitGate = (form: HTMLFormElement, options: SubmitGateOptions) => {
  const { campos, extraOk, extraLabel, boton, aviso, textoOk } = options;

  const refrescar = () => {
    const faltan = campos().filter((field) => !field.checkValidity());
    const extraCumple = extraOk?.() ?? true;
    const ok = faltan.length === 0 && extraCumple;

    if (boton) {
      boton.classList.toggle('is-disabled', !ok);
      boton.setAttribute('aria-disabled', String(!ok));
    }

    if (aviso) {
      // Lo de `extraOk` va primero: es la condicion propia del paso.
      const nombres = [
        ...new Set([...(extraCumple ? [] : [extraLabel ?? '']), ...faltan.map(nombreCampo)]),
      ].filter(Boolean);
      /*
       * Se cortan a tres. Con el formulario recien abierto faltan todos, y la
       * lista entera es un parrafo que nadie lee y que ademas empuja el boton
       * fuera de pantalla en movil.
       */
      const resto = nombres.length - MAX_NOMBRES;
      const lista =
        resto > 0
          ? `${nombres.slice(0, MAX_NOMBRES).join(', ')} y ${resto} campo${resto > 1 ? 's' : ''} más`
          : nombres.join(', ');

      aviso.textContent = ok
        ? (textoOk?.() ?? '')
        : nombres.length
          ? `Falta: ${lista}`
          : 'Falta algún dato obligatorio';
    }

    return ok;
  };

  /*
   * `change` ademas de `input`: los checkbox y los radios —consent, config— no
   * emiten `input` de forma fiable en todos los navegadores.
   */
  form.addEventListener('input', refrescar);
  form.addEventListener('change', refrescar);
  refrescar();

  return refrescar;
};

/**
 * Cada formulario se inicializa por separado con el [data-form-status] que lleva
 * dentro, asi que una pagina puede tener mas de uno a la vez.
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

  const refrescarGate = initSubmitGate(leadForm, {
    campos: fields,
    boton: leadForm.querySelector<HTMLButtonElement>('[type="submit"], [data-form-submit]'),
    aviso: leadForm.querySelector<HTMLElement>('[data-form-missing]'),
    ...options.gate,
  });

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
    /*
     * Cada formulario tiene su propia etiqueta ("Enviar solicitud", "Solicitar
     * presupuesto"...), asi que se guarda antes de sustituirla. Con innerHTML y
     * no con textContent: el boton de /contacto lleva dentro un <Icon> y con
     * textContent el icono desaparecia para siempre en el primer envio.
     */
    const submitLabel = submit?.innerHTML ?? '';
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
        submit.innerHTML = submitLabel;
      }
      /*
       * Va DESPUES de reactivar el boton: si no, un envio fallido lo dejaria
       * encendido con el formulario a medias, que es justo lo que la puerta
       * tiene que impedir.
       */
      refrescarGate();
    }
  });

  return { refrescarGate };
};
