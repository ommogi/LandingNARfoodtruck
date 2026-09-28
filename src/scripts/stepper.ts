/**
 * Botones de restar y sumar del campo de invitados (CampoInvitados.astro).
 *
 * Un unico listener delegado en document: los tres formularios pueden convivir
 * en la misma pagina (en /contacto estan el suyo y el del modal del header) y no
 * hace falta inicializar cada instancia por separado.
 */

const grupo = (el: Element) => el.closest<HTMLElement>('[data-stepper-grupo]');

/** Apaga el boton que ya no puede hacer nada, para que el tope se vea. */
const refrescarTopes = (input: HTMLInputElement) => {
  const contenedor = grupo(input);
  if (!contenedor) return;

  const valor = Number(input.value);
  const min = Number(input.min);
  const max = Number(input.max);

  const menos = contenedor.querySelector<HTMLButtonElement>('[data-stepper="-1"]');
  const mas = contenedor.querySelector<HTMLButtonElement>('[data-stepper="1"]');

  // Con el campo vacio los dos siguen activos: pulsar cualquiera lo arranca.
  const vacio = input.value === '';
  if (menos) menos.disabled = !vacio && Number.isFinite(min) && valor <= min;
  if (mas) mas.disabled = !vacio && Number.isFinite(max) && valor >= max;
};

document.addEventListener('click', (event) => {
  const boton = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-stepper]');
  if (!boton || boton.disabled) return;

  const input = grupo(boton)?.querySelector<HTMLInputElement>('input[type="number"]');
  if (!input) return;

  const paso = Number(boton.dataset.stepper);

  /*
   * stepUp() sobre un campo vacio no se comporta igual en todos los navegadores
   * (unos parten de 0, otros lanzan), asi que el arranque se fija a mano.
   */
  if (input.value === '') {
    input.value = input.min || '1';
  } else if (paso > 0) {
    input.stepUp();
  } else {
    input.stepDown();
  }

  /*
   * stepUp()/stepDown() NO disparan ningun evento. Sin esto, ni lead.ts
   * revalidaria el campo ni el boton de enviar se enteraria de que ya esta
   * relleno, que es justo el fallo que deja el boton apagado sin motivo.
   */
  input.dispatchEvent(new Event('input', { bubbles: true }));
  refrescarTopes(input);
});

/* Teclear a mano tambien mueve los topes. */
document.addEventListener('input', (event) => {
  const input = event.target as HTMLInputElement;
  if (input.type === 'number' && grupo(input)) refrescarTopes(input);
});

document
  .querySelectorAll<HTMLInputElement>('[data-stepper-grupo] input[type="number"]')
  .forEach(refrescarTopes);

export {};
