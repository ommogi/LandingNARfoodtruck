/**
 * Animaciones del configurador con GSAP. Todo es decorativo y nunca bloquea:
 * el estado y la navegacion no esperan a ningun tween.
 *
 *   - Cambio de paso (evento cf:paso): entra la cabecera y luego las tarjetas.
 *   - Bloques que aparecen (data-cuando): entran al quitarles `hidden`.
 *   - Tarjeta elegida: pulso corto.
 *   - +/- del mobiliario: la cifra da un pequeno salto.
 *   - Barra lateral: el tick de una fila recien completada hace "pop".
 *   - Stepper: el circulo del paso actual late al llegar.
 *
 * Igual que la web, solo con `html.anim` (JS y sin movimiento reducido). En la
 * vista previa del editor del panel no se anima nada.
 */

import { gsap } from 'gsap';

const EASE = 'power3.out';

/** Lo que entra al mostrar un paso, en orden de lectura. */
const PIEZAS = '.cf-card, .cf-equipo, .cf-bloque, .cf-caja, .cf-campo, .cf-nota, .cf-nav';

/** Bloques condicionales que merecen entrada al aparecer. */
const APARECEN = '.cf-amb-detalle, .cf-caja, .cf-stack, .cf-nota, .cf-bloque';

export const iniciarAnimaciones = (raiz: HTMLElement, { editor = false } = {}) => {
  const html = document.documentElement;
  if (editor || !html.classList.contains('anim')) return () => {};
  html.classList.add('anim-lista');

  /* --------------------------------------------------- Pasos */

  const entrarPaso = (paso: string) => {
    const seccion = raiz.querySelector<HTMLElement>(`.cf-paso[data-paso="${paso}"]`);
    if (!seccion) return;
    const cabecera = seccion.querySelectorAll<HTMLElement>('.cf-pill, .cf-title, .cf-subtitle');
    // Solo las piezas visibles y de primer nivel: animar tambien las anidadas
    // multiplicaria el desplazamiento.
    const piezas = [...seccion.querySelectorAll<HTMLElement>(PIEZAS)].filter(
      (el) => el.offsetParent !== null && !el.parentElement?.closest(PIEZAS),
    );

    gsap.killTweensOf([...cabecera, ...piezas]);
    gsap
      .timeline({ defaults: { ease: EASE } })
      .fromTo(cabecera, { y: 14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.06 })
      .fromTo(
        piezas,
        { y: 18, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.5,
          stagger: { amount: Math.min(0.35, piezas.length * 0.04) },
          clearProps: 'transform',
        },
        0.12,
      );

    const circulo = raiz.querySelector(`.cf-step[data-cf-step="${paso}"] .cf-step-num`);
    if (circulo) gsap.fromTo(circulo, { scale: 0.7 }, { scale: 1, duration: 0.6, ease: 'back.out(3)' });
  };

  raiz.addEventListener('cf:paso', (event) => entrarPaso((event as CustomEvent<string>).detail));

  /* --------------------------------------------------- Bloques que aparecen */

  const observador = new MutationObserver((cambios) => {
    cambios.forEach(({ target }) => {
      const el = target as HTMLElement;
      if (el.hidden || !el.matches(APARECEN) || el.closest('.cf-paso[hidden]')) return;
      gsap.fromTo(el, { y: 14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: EASE, clearProps: 'transform' });
    });
  });
  observador.observe(raiz, { attributes: true, attributeFilter: ['hidden'], subtree: true });

  /* --------------------------------------------------- Clics */

  raiz.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;

    // Tras el repintado (microtarea) ya se sabe si la tarjeta quedo elegida.
    const tarjeta = target.closest<HTMLElement>('.cf-card[data-elegir], .cf-card[data-alternar]');
    if (tarjeta) {
      queueMicrotask(() =>
        requestAnimationFrame(() => {
          if (tarjeta.getAttribute('aria-pressed') !== 'true') return;
          gsap.fromTo(tarjeta, { scale: 0.975 }, { scale: 1, duration: 0.45, ease: 'back.out(2.5)', clearProps: 'scale' });
        }),
      );
    }

    const mueble = target.closest<HTMLElement>('[data-mueble]');
    if (mueble) {
      const cifra = mueble.parentElement?.querySelector('output');
      if (cifra) gsap.fromTo(cifra, { y: Number(mueble.dataset.delta) > 0 ? -6 : 6 }, { y: 0, duration: 0.35, ease: 'back.out(3)' });
    }
  });

  /* --------------------------------------------------- Barra lateral */

  let completas = new Set<string>();
  let primera = true;

  /** Llamar tras cada repintado de la barra lateral. */
  return () => {
    const ahora = new Set(
      [...raiz.querySelectorAll<HTMLElement>('[data-cf-side-fila].is-completo')].map((f) => f.dataset.cfSideFila ?? ''),
    );
    if (!primera) {
      ahora.forEach((paso) => {
        if (completas.has(paso)) return;
        const tick = raiz.querySelector(`[data-cf-side-fila="${paso}"] .cf-side-estado`);
        if (tick) gsap.fromTo(tick, { scale: 0.4 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
      });
    }
    completas = ahora;
    primera = false;
  };
};
