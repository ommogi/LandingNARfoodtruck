/**
 * Paso 10: validacion del formulario de contacto y envio a /api/configurador.
 *
 * Se manda el estado completo; el servidor valida cada id contra el catalogo,
 * revalida las fechas y calcula el desglose de precios. El navegador nunca ve
 * un precio.
 */

import { setFieldValidity } from '../lead';
import { track } from '../modal';
import { borrarGuardado, store } from './estado';
import { t } from '../../data/configurador-textos';
import type { Catalogo } from '../../data/configurador';

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

interface Opciones {
  catalogo: Catalogo;
  /** Primer paso sin completar, o null si todo esta listo. */
  pasoPendiente: () => string | null;
  irA: (paso: string) => void;
}

export const iniciarEnvio = (raiz: HTMLElement, opciones: Opciones) => {
  const form = raiz.querySelector<HTMLFormElement>('[data-cf-form]');
  const status = raiz.querySelector<HTMLElement>('[data-cf-status]');
  const boton = raiz.querySelector<HTMLButtonElement>('[data-cf-enviar]');
  const botonTexto = raiz.querySelector<HTMLElement>('[data-cf-enviar-texto]');
  const exito = raiz.querySelector<HTMLElement>('[data-cf-exito]');
  const mensaje = raiz.querySelector<HTMLTextAreaElement>('[data-cf-mensaje]');
  const contador = raiz.querySelector<HTMLElement>('[data-cf-contador-mensaje]');
  if (!form) return;

  const campos = () =>
    [...form.querySelectorAll<Field>('input, select, textarea')].filter((f) => f.name && f.name !== 'website');

  const setStatus = (texto: string, error = false) => {
    if (!status) return;
    status.textContent = texto;
    status.classList.toggle('is-error', error);
  };

  mensaje?.addEventListener('input', () => {
    if (contador) contador.textContent = `${mensaje.value.length} / 750`;
  });

  /* Un campo marcado como invalido se revalida al corregirlo, no antes. */
  form.addEventListener('input', (event) => {
    const campo = event.target as Field;
    if (campo.classList?.contains('is-invalid')) setFieldValidity(campo);
  });

  let enviando = false;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (enviando) return;

    // La vista previa del editor nunca manda solicitudes de verdad.
    if (opciones.catalogo.editor) {
      setStatus('Vista previa del editor: aquí no se envían solicitudes.');
      return;
    }

    const pendiente = opciones.pasoPendiente();
    if (pendiente) {
      opciones.irA(pendiente);
      return;
    }

    const invalidos = campos().filter((c) => !setFieldValidity(c));
    if (invalidos.length) {
      setStatus(t(opciones.catalogo, 'solicitud.errorCampos'), true);
      invalidos[0]?.focus();
      return;
    }

    const datos = Object.fromEntries(new FormData(form));
    enviando = true;
    if (boton) boton.disabled = true;
    if (botonTexto) botonTexto.textContent = t(opciones.catalogo, 'nav.enviando');
    setStatus('');

    try {
      const response = await fetch('/api/configurador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: store.estado,
          contacto: {
            name: datos.name,
            company: datos.company,
            email: datos.email,
            phonePrefix: datos.phonePrefix,
            phone: datos.phone,
            message: datos.message,
            consent: datos.consent === 'on',
            marketing: datos.marketing === 'on',
          },
          website: datos.website,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        referencia?: string;
        paso?: string;
      };

      if (!response.ok || !data.ok) {
        setStatus(data.message ?? 'No se pudo enviar la solicitud. Inténtalo de nuevo en unos minutos.', true);
        if (data.paso) opciones.irA(data.paso);
        return;
      }

      track('configurador_envio', { proyecto: store.estado.proyecto.tipo, uso: store.estado.configuracion.uso });
      borrarGuardado();

      const ref = raiz.querySelector<HTMLElement>('[data-cf-referencia]');
      if (ref) ref.textContent = data.referencia ?? '';
      raiz.querySelectorAll<HTMLElement>('[data-paso], [data-cf-nav]').forEach((el) => (el.hidden = true));
      raiz.classList.add('is-enviado');
      if (exito) {
        exito.hidden = false;
        window.scrollTo({ top: 0 });
        exito.focus();
      }
    } catch {
      setStatus('No hay conexión. Tus datos siguen aquí: vuelve a intentarlo.', true);
    } finally {
      enviando = false;
      if (boton) boton.disabled = false;
      if (botonTexto) botonTexto.textContent = t(opciones.catalogo, 'nav.enviar');
    }
  });
};
