/**
 * Campos numericos con botones − y +. Generaliza el stepper de invitados
 * (CampoInvitados.astro): mismo marcado (.stepper[data-stepper-grupo] con
 * botones [data-stepper]) y un unico listener delegado en document.
 *
 *   - Todo input[type=number] que no venga ya envuelto se envuelve aqui.
 *   - Mantener pulsado repite, cada vez mas rapido.
 *   - Teclado: flechas (nativas) y Mayus+flecha salta de 10 en 10.
 *   - La rueda del raton solo cambia el valor con el campo enfocado.
 */

import { nodo } from './base';

const grupo = (el: Element) => el.closest<HTMLElement>('[data-stepper-grupo]');
const campo = (el: Element) => grupo(el)?.querySelector<HTMLInputElement>('input[type="number"]') ?? null;

/** Apaga el boton que ya no puede hacer nada, para que el tope se vea. */
const refrescarTopes = (input: HTMLInputElement) => {
  const contenedor = grupo(input);
  if (!contenedor) return;
  const valor = Number(input.value);
  const vacio = input.value === '';
  const min = input.min === '' ? NaN : Number(input.min);
  const max = input.max === '' ? NaN : Number(input.max);
  const menos = contenedor.querySelector<HTMLButtonElement>('[data-stepper="-1"]');
  const mas = contenedor.querySelector<HTMLButtonElement>('[data-stepper="1"]');
  // Con el campo vacio los dos siguen activos: pulsar cualquiera lo arranca.
  if (menos) menos.disabled = input.disabled || (!vacio && Number.isFinite(min) && valor <= min);
  if (mas) mas.disabled = input.disabled || (!vacio && Number.isFinite(max) && valor >= max);
};

/** Suma `pasos` respetando min, max y step. Lanza input como si se tecleara. */
const sumar = (input: HTMLInputElement, pasos: number) => {
  if (input.disabled || input.readOnly) return;
  /*
   * stepUp() sobre un campo vacio no se comporta igual en todos los
   * navegadores (unos parten de 0, otros lanzan), asi que el arranque se fija.
   */
  if (input.value === '') input.value = input.min || '1';
  else if (pasos > 0) input.stepUp(pasos);
  else input.stepDown(-pasos);
  // stepUp()/stepDown() no disparan eventos: sin esto nadie se entera.
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  refrescarTopes(input);
};

/* --------------------------------------------------- Mantener pulsado */

let repeticion = 0;
let repitio = false;

const parar = () => {
  clearTimeout(repeticion);
  repeticion = 0;
};

document.addEventListener('pointerdown', (event) => {
  const boton = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-stepper]');
  if (!boton || boton.disabled || event.button !== 0) return;
  const input = campo(boton);
  if (!input) return;
  repitio = false;
  let espera = 380;
  const paso = Number(boton.dataset.stepper);
  const tick = () => {
    if (boton.disabled) return parar();
    repitio = true;
    sumar(input, paso);
    espera = Math.max(45, espera * 0.8);
    repeticion = window.setTimeout(tick, espera);
  };
  repeticion = window.setTimeout(tick, espera);
});
['pointerup', 'pointercancel', 'pointerleave', 'blur'].forEach((ev) =>
  document.addEventListener(ev, parar, true),
);

document.addEventListener('click', (event) => {
  const boton = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-stepper]');
  if (!boton || boton.disabled) return;
  // Si ya repitio al mantener pulsado, el clic final no suma uno mas.
  if (repitio) {
    repitio = false;
    return;
  }
  const input = campo(boton);
  if (input) sumar(input, Number(boton.dataset.stepper));
});

/* --------------------------------------------------- Teclado y rueda */

document.addEventListener('keydown', (event) => {
  const input = event.target as HTMLInputElement;
  if (input.type !== 'number' || !grupo(input) || !event.shiftKey) return;
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
  event.preventDefault();
  sumar(input, event.key === 'ArrowUp' ? 10 : -10);
});

document.addEventListener(
  'wheel',
  (event) => {
    const input = event.target as HTMLInputElement;
    if (input.type !== 'number' || !grupo(input) || document.activeElement !== input) return;
    event.preventDefault();
    sumar(input, event.deltaY < 0 ? 1 : -1);
  },
  { passive: false },
);

/* Teclear a mano tambien mueve los topes. */
document.addEventListener('input', (event) => {
  const input = event.target as HTMLInputElement;
  if (input.type === 'number' && grupo(input)) refrescarTopes(input);
});

/* --------------------------------------------------- Envolver */

const boton = (paso: 1 | -1, etiqueta: string) => {
  const b = nodo('button', 'stepper-boton', paso > 0 ? '+' : '−');
  b.type = 'button';
  b.dataset.stepper = String(paso);
  b.setAttribute('aria-label', etiqueta);
  return b;
};

export const mejorarNumero = (input: HTMLInputElement) => {
  if (!grupo(input)) {
    const envoltorio = nodo('span', 'stepper ui-stepper');
    envoltorio.dataset.stepperGrupo = '';
    input.before(envoltorio);
    envoltorio.append(boton(-1, 'Restar'), input, boton(1, 'Sumar'));
  }
  // Los botones siguen el disabled del campo (p. ej. "No lo sé" en el configurador).
  new MutationObserver(() => refrescarTopes(input)).observe(input, {
    attributes: true,
    attributeFilter: ['disabled', 'min', 'max'],
  });
  refrescarTopes(input);
};
