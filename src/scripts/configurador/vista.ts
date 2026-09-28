/**
 * Enlace declarativo entre el marcado y el estado. Los componentes .astro no
 * llevan logica: solo atributos.
 *
 *   data-elegir="ruta" data-valor="x"    boton de una sola opcion (aria-pressed)
 *   data-alternar="ruta" data-valor="x"  boton que anade/quita de una lista
 *   data-bind="ruta"                      input, select, textarea o checkbox
 *   data-cuando="expr"                    se oculta si la expresion es falsa
 *   data-contador="ruta" data-max="500"   "12 / 500"
 *
 * Expresiones de data-cuando: terminos unidos por "&".
 *   ruta=a|b     el valor (como texto) es a o b
 *   ruta!=a      distinto de a
 *   nombre       bandera derivada (ver BANDERAS) o ruta con valor verdadero
 *   !nombre      lo contrario
 */

import {
  esRoadshow,
  opcionPorId,
  type Catalogo,
} from '../../data/configurador';
import { alternar, escribir, leer, store } from './estado';

type Campo = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const aValor = (texto: string): unknown => (texto === 'true' ? true : texto === 'false' ? false : texto);

export const crearVista = (raiz: HTMLElement, catalogo: Catalogo) => {
  const e = () => store.estado;

  /** Condiciones con nombre: lo que no se expresa con una sola ruta. */
  const BANDERAS: Record<string, () => boolean> = {
    roadshow: () => esRoadshow(e()),
    proyectoConTexto: () =>
      Boolean(
        opcionPorId(catalogo, e().proyecto.tipo)?.a_medida || opcionPorId(catalogo, e().proyecto.subtipo)?.a_medida,
      ),
    configAMedida: () => Boolean(opcionPorId(catalogo, e().configuracion.sub)?.a_medida),
    ambAMedida: () => Boolean(opcionPorId(catalogo, e().ambientacion.opcion)?.a_medida),
    brandAMedida: () => Boolean(opcionPorId(catalogo, e().branding.tipo)?.a_medida),
  };

  const termino = (t: string): boolean => {
    const negado = t.startsWith('!') && !t.includes('=');
    const limpio = negado ? t.slice(1) : t;

    const distinto = limpio.indexOf('!=');
    if (distinto > 0) return String(leer(limpio.slice(0, distinto))) !== limpio.slice(distinto + 2);

    const igual = limpio.indexOf('=');
    if (igual > 0) {
      const actual = String(leer(limpio.slice(0, igual)));
      return limpio.slice(igual + 1).split('|').includes(actual);
    }

    const valor = limpio in BANDERAS ? BANDERAS[limpio]!() : Boolean(leer(limpio));
    return negado ? !valor : valor;
  };

  const cumple = (expr: string) => expr.split('&').every((t) => termino(t.trim()));

  /* --------------------------------------------------- Eventos */

  raiz.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;

    const elegir = target.closest<HTMLElement>('[data-elegir]');
    if (elegir) {
      escribir(elegir.dataset.elegir as string, aValor(elegir.dataset.valor ?? ''), catalogo);
      return;
    }

    const alt = target.closest<HTMLElement>('[data-alternar]');
    if (alt) alternar(alt.dataset.alternar as string, alt.dataset.valor ?? '', catalogo);
  });

  const alEscribir = (event: Event) => {
    const campo = event.target as Campo;
    const ruta = campo.dataset?.bind;
    if (!ruta) return;

    if (campo instanceof HTMLInputElement && campo.type === 'checkbox') {
      escribir(ruta, campo.checked, catalogo);
    } else if (campo instanceof HTMLInputElement && campo.type === 'number') {
      const n = Number.parseInt(campo.value, 10);
      escribir(ruta, Number.isFinite(n) && n > 0 ? n : null, catalogo);
      // Escribir un numero desmarca el "no lo se" que lo acompana.
      const noSe = `${ruta}NoSe`;
      if (Number.isFinite(n) && leer(noSe) === true) escribir(noSe, false, catalogo);
    } else {
      escribir(ruta, campo.value, catalogo);
    }
  };

  raiz.addEventListener('input', alEscribir);
  raiz.addEventListener('change', alEscribir);

  /* --------------------------------------------------- Pintado */

  const pintar = () => {
    raiz.querySelectorAll<HTMLElement>('[data-elegir]').forEach((el) => {
      el.setAttribute('aria-pressed', String(leer(el.dataset.elegir as string) === aValor(el.dataset.valor ?? '')));
    });

    raiz.querySelectorAll<HTMLElement>('[data-alternar]').forEach((el) => {
      const lista = (leer(el.dataset.alternar as string) as string[] | undefined) ?? [];
      el.setAttribute('aria-pressed', String(lista.includes(el.dataset.valor ?? '')));
    });

    raiz.querySelectorAll<Campo>('[data-bind]').forEach((campo) => {
      if (campo === document.activeElement) return;
      const valor = leer(campo.dataset.bind as string);
      if (campo instanceof HTMLInputElement && campo.type === 'checkbox') campo.checked = valor === true;
      else campo.value = valor === null || valor === undefined ? '' : String(valor);
    });

    raiz.querySelectorAll<HTMLElement>('[data-cuando]').forEach((el) => {
      el.hidden = !cumple(el.dataset.cuando as string);
    });

    raiz.querySelectorAll<HTMLElement>('[data-contador]').forEach((el) => {
      const texto = String(leer(el.dataset.contador as string) ?? '');
      el.textContent = `${texto.length} / ${el.dataset.max}`;
    });

    // Los "no lo se" apagan su campo numerico o de horario.
    const apagar = (ruta: string, apagado: boolean) =>
      raiz.querySelectorAll<Campo>(`[data-bind="${ruta}"]`).forEach((c) => (c.disabled = apagado));
    apagar('cocina.personas', e().cocina.personasNoSe);
    apagar('logistica.asistentes', e().logistica.asistentesNoSe);
    apagar('logistica.inicio', e().logistica.sinHorario);
    apagar('logistica.fin', e().logistica.sinHorario);

    // Titulo alternativo del paso 2 en Roadshow.
    raiz.querySelectorAll<HTMLElement>('[data-titulo-roadshow]').forEach((h) => {
      h.textContent = (esRoadshow(e()) ? h.dataset.tituloRoadshow : h.dataset.tituloNormal) ?? h.textContent;
    });
  };

  return { pintar, cumple };
};
