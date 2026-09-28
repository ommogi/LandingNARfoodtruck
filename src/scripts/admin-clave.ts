/**
 * Formulario de contrasena del panel (/{ADMIN_PATH}/clave).
 */

import { rutaPanel } from './admin-rutas';

const form = document.querySelector<HTMLFormElement>('[data-clave-form]');
const status = document.querySelector<HTMLElement>('[data-clave-status]');
const boton = document.querySelector<HTMLButtonElement>('[data-clave-enviar]');
const ver = document.querySelector<HTMLInputElement>('[data-clave-ver]');

const ERRORES: Record<string, string> = {
  corta: 'La contraseña nueva tiene que tener al menos 12 caracteres.',
  actual: 'La contraseña actual no es correcta.',
  igual: 'La contraseña nueva tiene que ser distinta de la anterior.',
  debil: 'Esa contraseña es demasiado débil. Prueba con una frase más larga.',
  limite: 'Demasiados intentos. Espera unos minutos.',
  sesion: 'Tu sesión ha caducado. Vuelve a entrar.',
};

const setStatus = (texto: string, tipo: 'error' | 'success' | '' = '') => {
  if (!status) return;
  status.textContent = texto;
  status.classList.toggle('is-error', tipo === 'error');
  status.classList.toggle('is-success', tipo === 'success');
};

ver?.addEventListener('change', () => {
  form?.querySelectorAll<HTMLInputElement>('input[type="password"], input[data-era-password]').forEach((i) => {
    i.dataset.eraPassword = '';
    i.type = ver.checked ? 'text' : 'password';
  });
});

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const datos = new FormData(form);
  const nueva = String(datos.get('nueva') ?? '');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  if (nueva !== String(datos.get('repetida') ?? '')) {
    setStatus('Las dos contraseñas nuevas no coinciden.', 'error');
    return;
  }

  if (boton) boton.disabled = true;
  setStatus('Guardando…');
  try {
    const response = await fetch(rutaPanel('/api/clave'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actual: datos.get('actual') ?? '', nueva }),
    });
    const data = (await response.json().catch(() => ({}))) as { ok?: boolean; motivo?: string };
    if (!response.ok || !data.ok) {
      setStatus(ERRORES[data.motivo ?? ''] ?? 'No se pudo guardar. Inténtalo de nuevo.', 'error');
      if (response.status === 401 && data.motivo === 'sesion') window.setTimeout(() => window.location.assign(rutaPanel('/login')), 1500);
      return;
    }
    form.reset();
    setStatus('Contraseña guardada.', 'success');
    if ('recuperando' in form.dataset) window.setTimeout(() => window.location.assign(rutaPanel('')), 900);
  } catch {
    setStatus('No hay conexión. Inténtalo de nuevo.', 'error');
  } finally {
    if (boton) boton.disabled = false;
  }
});

export {};
