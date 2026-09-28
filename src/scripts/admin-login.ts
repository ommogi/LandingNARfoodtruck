/**
 * Acceso al panel. Tres modos en el mismo formulario:
 *
 *   clave   correo + contrasena -> {base}/entrar (lo normal)
 *   email   pedir un codigo por correo -> {base}/codigo
 *   codigo  canjearlo -> {base}/verificar; luego el middleware obliga a
 *           fijar una contrasena nueva en {base}/clave
 *
 * El codigo solo sirve para el primer acceso o para recuperar la contrasena.
 * Aqui no hay cliente de Supabase: la sesion vive en cookies httpOnly y esas
 * solo las escribe el servidor.
 */

import { LARGO_CODIGO, esCodigoValido, limpiarCodigo } from '../data/acceso';
import { rutaPanel } from './admin-rutas';

const form = document.querySelector<HTMLFormElement>('[data-login-form]');
const status = document.querySelector<HTMLElement>('[data-login-status]');
const pasoCodigo = document.querySelector<HTMLElement>('[data-login-paso-codigo]');
const volver = document.querySelector<HTMLButtonElement>('[data-login-volver]');
const pasoClave = document.querySelector<HTMLElement>('[data-login-paso-clave]');
const recuperar = document.querySelector<HTMLButtonElement>('[data-login-recuperar]');
const ayuda = document.querySelector<HTMLElement>('[data-login-ayuda]');
const verClave = document.querySelector<HTMLButtonElement>('[data-login-ver]');

const MENSAJE_ENVIADO =
  'Si ese correo tiene acceso, te acaba de llegar un código. Revisa también la carpeta de spam.';

const ERRORES: Record<string, string> = {
  limite: 'Demasiados intentos. Espera unos minutos antes de volver a probar.',
  'limite-hora':
    'Se ha alcanzado el límite de correos de esta hora. Vuelve a intentarlo más tarde.',
  envio: 'No se pudo enviar el código. Inténtalo de nuevo en un minuto.',
  email: 'Ese correo no tiene un formato válido.',
  codigo: 'Código incorrecto o caducado. Pide uno nuevo.',
  credenciales: 'Correo o contraseña incorrectos.',
  'sin-configurar': 'El acceso no está configurado todavía.',
};

if (form && pasoCodigo && volver) {
  const boton = form.querySelector<HTMLButtonElement>('[data-login-enviar]');
  const email = form.querySelector<HTMLInputElement>('[name="email"]');
  const codigo = form.querySelector<HTMLInputElement>('[name="codigo"]');
  const password = form.querySelector<HTMLInputElement>('[name="password"]');

  type Paso = 'clave' | 'email' | 'codigo';
  let paso: Paso = 'clave';
  let enviando = false;

  const setStatus = (message: string, state: 'error' | '' = '') => {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('is-error', state === 'error');
  };

  const mostrarPaso = (siguiente: Paso) => {
    paso = siguiente;
    const enCodigo = siguiente === 'codigo';
    const enClave = siguiente === 'clave';

    pasoCodigo.hidden = !enCodigo;
    if (pasoClave) pasoClave.hidden = !enClave;
    if (password) password.required = enClave;
    volver.hidden = enClave;
    if (recuperar) recuperar.hidden = !enClave;
    if (ayuda) ayuda.hidden = enClave;
    if (email) email.readOnly = enCodigo;
    if (boton) {
      boton.textContent = enClave ? 'Entrar' : enCodigo ? 'Verificar código' : 'Enviarme el código';
    }

    if (enCodigo) codigo?.focus();
    else if (enClave && email?.value) password?.focus();
    else email?.focus();
  };

  verClave?.addEventListener('click', () => {
    if (!password) return;
    const visible = password.type === 'password';
    password.type = visible ? 'text' : 'password';
    verClave.textContent = visible ? 'Ocultar' : 'Mostrar';
    verClave.setAttribute('aria-pressed', String(visible));
  });

  recuperar?.addEventListener('click', () => {
    setStatus('');
    mostrarPaso('email');
  });

  /** Devuelve el `motivo` del endpoint, o 'envio' si ni siquiera hubo respuesta. */
  const pedir = async (url: string, cuerpo: unknown): Promise<{ ok: boolean; motivo?: string }> => {
    try {
      const respuesta = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      });
      return (await respuesta.json()) as { ok: boolean; motivo?: string };
    } catch {
      return { ok: false, motivo: 'envio' };
    }
  };

  /* ---------------------------------------------- Casillas del codigo */

  const cajas = Array.from(document.querySelectorAll<HTMLElement>('[data-codigo-caja]'));
  let codigoEnfocado = false;

  /** Las casillas no guardan nada: son el reflejo del input real que tienen encima. */
  const pintarCajas = () => {
    const valor = codigo?.value ?? '';
    // Con el codigo completo se marca la ultima, no una septima que no existe.
    const activa = Math.min(valor.length, cajas.length - 1);

    cajas.forEach((caja, i) => {
      caja.textContent = valor[i] ?? '';
      caja.classList.toggle('is-active', codigoEnfocado && i === activa);
    });
  };

  if (codigo) {
    codigo.addEventListener('input', () => {
      codigo.value = limpiarCodigo(codigo.value);
      pintarCajas();

      // Con el codigo entero puesto, pedir un clic mas solo estorba.
      if (codigo.value.length === LARGO_CODIGO) form.requestSubmit();
    });

    codigo.addEventListener('focus', () => {
      codigoEnfocado = true;
      pintarCajas();
    });

    codigo.addEventListener('blur', () => {
      codigoEnfocado = false;
      pintarCajas();
    });
  }

  volver.addEventListener('click', () => {
    if (codigo) codigo.value = '';
    pintarCajas();
    setStatus('');
    mostrarPaso('clave');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (enviando || !email?.value) return;
    if (paso === 'clave' && !password?.value) {
      setStatus('Escribe tu contraseña.', 'error');
      password?.focus();
      return;
    }

    if (paso === 'codigo' && !esCodigoValido(codigo?.value ?? '')) {
      setStatus(`El código son ${LARGO_CODIGO} dígitos.`, 'error');
      return;
    }

    enviando = true;
    if (boton) boton.disabled = true;
    setStatus(paso === 'email' ? 'Enviando…' : 'Comprobando…');

    const direccion = email.value.trim();

    const resultado =
      paso === 'clave'
        ? await pedir(rutaPanel('/entrar'), { email: direccion, password: password?.value ?? '' })
        : paso === 'codigo'
          ? await pedir(rutaPanel('/verificar'), { email: direccion, token: codigo?.value })
          : await pedir(rutaPanel('/codigo'), { email: direccion });

    enviando = false;
    if (boton) boton.disabled = false;

    if (!resultado.ok) {
      setStatus(ERRORES[resultado.motivo ?? ''] ?? 'No se pudo entrar. Inténtalo de nuevo.', 'error');
      if (paso === 'clave' && password) {
        password.value = '';
        password.focus();
      }
      if (paso === 'codigo' && codigo) {
        codigo.value = '';
        codigo.focus();
        pintarCajas();
      }
      return;
    }

    if (paso === 'email') {
      setStatus(MENSAJE_ENVIADO);
      mostrarPaso('codigo');
      return;
    }

    /* Recarga completa a proposito: la sesion acaba de escribirse en cookies y es
       el middleware quien tiene que leerlas. Tras el codigo, lleva a crear la
       contrasena; tras la contrasena, al panel. */
    setStatus('Entrando…');
    window.location.assign(rutaPanel(paso === 'codigo' ? '/clave' : ''));
  });
}

export {};
