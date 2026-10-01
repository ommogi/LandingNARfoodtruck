/**
 * Animaciones de la web con GSAP: hero de cada pagina, titulares, bloques al
 * hacer scroll, fotos, cifras y botones.
 *
 * Contrato con el marcado (nada se anima por selectores fragiles):
 *   data-anim="hero"         columna de texto del hero; entran sus hijos y el h1 por lineas
 *   data-anim="hero-media"   foto del hero
 *   data-reveal              bloque que entra al hacer scroll
 *   data-reveal-stagger      junto a data-reveal: entran sus hijos en cascada
 *   data-anim="imagen"       foto que se descubre con mascara
 *   data-anim="contador"     cifra que cuenta desde 0 ("25.000+")
 * Los h2 grandes de <main> (22 px o mas) entran por lineas sin marcarlos.
 *
 * El estado oculto de partida lo pone global.css bajo `html.anim` (ver el
 * script inline de BaseLayout). Con movimiento reducido esa clase no existe y
 * aqui no se crea ningun tween. Solo se anima transform, opacidad y clip-path.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

const html = document.documentElement;
const animar = html.classList.contains('anim');

/** Lo que se descubre al entrar en pantalla: algo antes de que asome del todo. */
const ENTRADA = 'top 88%';

const EASE = 'power3.out';

/** Titular por lineas con mascara: cada linea sube desde debajo de su borde. */
const lineas = (el: HTMLElement, opciones: gsap.TweenVars = {}) => {
  const split = SplitText.create(el, { type: 'lines', mask: 'lines', autoSplit: true, aria: 'auto' });
  return gsap.from(split.lines, {
    yPercent: 105,
    duration: 0.9,
    ease: 'power4.out',
    stagger: 0.1,
    ...opciones,
  });
};

/**
 * true si ya se marco en esta sesion; si no, la marca y devuelve false. Sin
 * sessionStorage (modo privado estricto) se trata como ya vista: mejor no
 * animar que repetir la animacion en cada pagina.
 */
const yaVista = (clave: string) => {
  try {
    if (sessionStorage.getItem(clave)) return true;
    sessionStorage.setItem(clave, '1');
    return false;
  } catch {
    return true;
  }
};

/* --------------------------------------------------- Hero */

const animarHero = () => {
  const texto = document.querySelector<HTMLElement>('[data-anim="hero"]');
  const media = document.querySelector<HTMLElement>('[data-anim="hero-media"]');
  const tl = gsap.timeline({ defaults: { ease: EASE } });

  // La cabecera baja solo la primera vez de la sesion: al navegar entre
  // paginas tiene que estar ya en su sitio, no repetir la entrada cada vez.
  const cabecera = document.querySelector<HTMLElement>('[data-header]');
  if (cabecera && !yaVista('nar-cabecera-animada')) {
    tl.from(cabecera, { yPercent: -100, autoAlpha: 0, duration: 0.6 }, 0);
  }

  if (media) {
    gsap.set(media, { autoAlpha: 1 });
    tl.fromTo(
      media,
      { clipPath: 'inset(0% 0% 100% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'power4.inOut', clearProps: 'clipPath' },
      0.05,
    );
    const foto = media.querySelector('img');
    if (foto) tl.from(foto, { scale: 1.12, duration: 1.6, ease: 'power3.out' }, 0.05);
  }

  if (texto) {
    const hijos = [...texto.children] as HTMLElement[];
    gsap.set(hijos, { autoAlpha: 1 });
    const h1 = texto.querySelector<HTMLElement>('h1');
    const antes = hijos.filter((h) => h1 && h.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING);
    const despues = hijos.filter((h) => h !== h1 && !antes.includes(h));

    if (antes.length) tl.from(antes, { y: 14, autoAlpha: 0, duration: 0.6 }, 0.2);
    if (h1) tl.add(lineas(h1), 0.3);
    if (despues.length) tl.from(despues, { y: 24, autoAlpha: 0, duration: 0.8, stagger: 0.09 }, 0.65);
  }
};

/* --------------------------------------------------- Al hacer scroll */

const animarTitulares = () => {
  document.querySelectorAll<HTMLElement>('main h2:not(.sr-only)').forEach((h2) => {
    if (h2.closest('[data-anim="hero"], [role="dialog"], dialog')) return;
    if (parseFloat(getComputedStyle(h2).fontSize) < 22) return;
    const tween = lineas(h2, { paused: true });
    ScrollTrigger.create({ trigger: h2, start: ENTRADA, once: true, onEnter: () => tween.play() });

    // Adorno de SectionHeading: las dos rayas se dibujan desde la estrella.
    const adorno = h2.nextElementSibling;
    if (adorno?.matches('span[aria-hidden="true"]')) {
      const rayas = adorno.querySelectorAll('i');
      gsap.from(rayas, {
        scaleX: 0,
        transformOrigin: (i: number) => (i === 0 ? 'right center' : 'left center'),
        duration: 0.8,
        ease: 'power2.out',
        delay: 0.3,
        scrollTrigger: { trigger: h2, start: ENTRADA, once: true },
      });
    }
  });
};

const animarBloques = () => {
  // Bloques sueltos: por lotes, para que los que entran a la vez se escalonen.
  const sueltos = gsap.utils.toArray<HTMLElement>('[data-reveal]:not([data-reveal-stagger])');
  ScrollTrigger.batch(sueltos, {
    start: ENTRADA,
    once: true,
    onEnter: (lote) =>
      gsap.fromTo(
        lote,
        { y: 34, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.9, ease: EASE, stagger: 0.12, overwrite: true },
      ),
  });

  // Rejillas: entran sus hijos en cascada, con el retardo total acotado.
  document.querySelectorAll<HTMLElement>('[data-reveal-stagger]').forEach((rejilla) => {
    const hijos = [...rejilla.children];
    gsap.fromTo(
      hijos,
      { y: 26, autoAlpha: 0 },
      {
        y: 0,
        autoAlpha: 1,
        duration: 0.7,
        ease: EASE,
        stagger: { amount: Math.min(0.45, hijos.length * 0.08) },
        scrollTrigger: { trigger: rejilla, start: ENTRADA, once: true },
      },
    );
  });
};

const animarImagenes = () => {
  document.querySelectorAll<HTMLElement>('[data-anim="imagen"]').forEach((foto) => {
    gsap.set(foto, { autoAlpha: 1 });
    gsap
      .timeline({ scrollTrigger: { trigger: foto, start: ENTRADA, once: true } })
      .fromTo(
        foto,
        { clipPath: 'inset(100% 0% 0% 0%)', scale: 1.12 },
        { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 1.3, ease: 'power4.inOut', clearProps: 'clipPath' },
      );
  });
};

/**
 * Parallax de la foto de fondo del hero de la home. La foto es mas alta que su
 * caja para poder desplazarla mucho: baja mientras se hace scroll, asi va mas
 * lenta que la pagina. En movil la foto es una franja: el recorrido es menor.
 */
const animarParallax = () => {
  const seccion = document.querySelector<HTMLElement>('#inicio');
  const foto = seccion?.querySelector<HTMLElement>('[data-anim="hero-media"] img');
  if (!seccion || !foto) return;

  const mm = gsap.matchMedia();
  mm.add({ escritorio: '(min-width: 821px)', movil: '(max-width: 820px)' }, (ctx) => {
    const { escritorio } = ctx.conditions as { escritorio: boolean };
    // % de alto extra. Mas sobrante = mas recorrido pero tambien mas zoom (la
    // foto es object-cover): en movil el truck tiene que seguir viendose entero.
    const sobra = escritorio ? 40 : 16;
    // Empieza subida la mitad del sobrante: en reposo el encuadre es el central
    // (truck completo, como sin parallax).
    gsap.set(foto, { height: `${100 + sobra}%`, top: `-${sobra / 2}%`, position: 'relative' });

    const scroll = { trigger: seccion, start: 'top top', end: 'bottom top', scrub: true };
    // Baja mientras la seccion sale de pantalla. El hueco que deja arriba
    // nunca se ve: la foto avanza mas despacio que el scroll.
    gsap.fromTo(
      foto,
      { yPercent: 0 },
      { yPercent: (sobra * 100) / (100 + sobra), ease: 'none', scrollTrigger: scroll },
    );
    return () => gsap.set(foto, { clearProps: 'height,top,position' });
  });
};

/** "25.000+" cuenta de 0 a 25000 y conserva separador de miles y sufijo. */
const animarContadores = () => {
  const formato = new Intl.NumberFormat('es-ES');
  document.querySelectorAll<HTMLElement>('[data-anim="contador"]').forEach((el) => {
    const original = el.textContent?.trim() ?? '';
    const m = original.match(/^([\d.]+)(.*)$/);
    if (!m) return;
    const destino = Number(m[1]!.replace(/\./g, ''));
    const sufijo = m[2] ?? '';
    const valor = { n: 0 };
    gsap.to(valor, {
      n: destino,
      duration: 1.8,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: ENTRADA, once: true },
      onUpdate: () => {
        el.textContent = `${formato.format(Math.round(valor.n))}${sufijo}`;
      },
      onComplete: () => {
        el.textContent = original;
      },
    });
  });
};

/* --------------------------------------------------- Botones */

/**
 * Botones: la elevacion al pasar el raton y el hundido al pulsar ya los hace el
 * CSS (.button en global.css). GSAP solo anade que el icono se adelante un
 * poco, que el CSS no puede interpolar sin pisar el transform del boton.
 */
const animarBotones = () => {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const iconos = (event: Event) => {
    const boton = (event.target as Element).closest<HTMLElement>('.button');
    const fuera = (event as PointerEvent).relatedTarget as Node | null;
    if (!boton || (fuera && boton.contains(fuera)) || boton.matches(':disabled, .is-disabled')) return null;
    return boton.querySelectorAll('svg');
  };

  document.addEventListener('pointerover', (event) => {
    const svg = iconos(event);
    if (svg?.length) gsap.to(svg, { x: 4, duration: 0.35, ease: 'back.out(2.5)' });
  });
  document.addEventListener('pointerout', (event) => {
    const svg = iconos(event);
    if (svg?.length) gsap.to(svg, { x: 0, duration: 0.35, ease: EASE });
  });
};

/* --------------------------------------------------- Arranque */

if (animar) {
  html.classList.add('anim-lista');
  animarHero();
  animarTitulares();
  animarBloques();
  animarImagenes();
  animarParallax();
  animarContadores();
  animarBotones();

  // Las fuentes web cambian la altura de los titulares: se recalculan los
  // disparadores cuando terminan de cargar.
  void document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
