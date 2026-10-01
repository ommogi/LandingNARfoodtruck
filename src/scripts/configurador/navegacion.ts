/**
 * Paso actual, botones Continuar / Volver / Volver al resumen, cabecera de
 * pasos y numeracion "PASO N DE 10".
 *
 * Regla: solo se llega a un paso si todos los anteriores estan completos. El
 * paso de cocina desaparece (y la numeracion baja a 9) si el uso no lo pide.
 */

import {
  esRoadshow,
  faltaEnPaso,
  fechasServicio,
  pasosVisibles,
  type Catalogo,
  type PasoId,
} from '../../data/configurador';
import { esFechaReservable } from '../../data/disponibilidad';
import { t, type ClaveTexto } from '../../data/configurador-textos';
import { getDispo } from './calendario';
import { guardar, store } from './estado';
import { track } from '../modal';

export const crearNavegacion = (raiz: HTMLElement, catalogo: Catalogo) => {
  const etiqueta = (paso: PasoId) => t(catalogo, `paso.${paso}` as ClaveTexto);
  /** En la vista previa del editor se navega libremente y no se mide nada. */
  const editor = Boolean(catalogo.editor);
  const secciones = new Map(
    [...raiz.querySelectorAll<HTMLElement>('[data-paso]')].map((s) => [s.dataset.paso as PasoId, s]),
  );
  const volver = raiz.querySelector<HTMLButtonElement>('[data-cf-volver]');
  const continuar = raiz.querySelector<HTMLButtonElement>('[data-cf-continuar]');
  const continuarTexto = raiz.querySelector<HTMLElement>('[data-cf-continuar-texto]');
  const enviar = raiz.querySelector<HTMLButtonElement>('[data-cf-enviar]');
  const alResumen = raiz.querySelector<HTMLButtonElement>('[data-cf-al-resumen]');
  const pista = raiz.querySelector<HTMLElement>('[data-cf-pista]');

  let actual: PasoId = 'proyecto';
  /** true mientras se edita un paso llegando desde "Editar" del resumen. */
  let editando = false;

  const visibles = () => pasosVisibles(store.estado, catalogo);

  /** Motivo que bloquea el paso, incluida la disponibilidad real de las fechas. */
  const falta = (paso: PasoId): string => {
    const motivo = faltaEnPaso(paso, store.estado, catalogo);
    if (motivo) return motivo;
    if (paso === 'fecha') {
      const malas = fechasServicio(store.estado).filter((f) => !esFechaReservable(f, getDispo()));
      if (malas.length) return esRoadshow(store.estado) ? 'Alguna parada tiene una fecha no disponible' : 'La fecha elegida no está disponible';
    }
    return '';
  };

  const alcanzable = (paso: PasoId) => {
    const v = visibles();
    const i = v.indexOf(paso);
    if (i < 0) return false;
    if (editor) return true;
    return v.slice(0, i).every((p) => p === 'resumen' || falta(p) === '');
  };

  /** Primer paso incompleto: destino si el guardado ya no es alcanzable. */
  const primerIncompleto = () => visibles().find((p) => p !== 'resumen' && p !== 'solicitud' && falta(p) !== '') ?? 'resumen';

  const mostrar = (paso: PasoId, { foco = true } = {}) => {
    actual = paso;
    if (paso === 'resumen') editando = false;
    secciones.forEach((s, id) => (s.hidden = id !== paso));
    guardar(paso);
    if (!editor) track('configurador_paso', { paso, numero: visibles().indexOf(paso) + 1 });
    raiz.dispatchEvent(new CustomEvent('cf:paso', { detail: paso, bubbles: true }));

    const url = new URL(window.location.href);
    url.searchParams.set('paso', paso);
    history.replaceState(null, '', url);

    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    if (foco) secciones.get(paso)?.querySelector<HTMLElement>('[data-cf-titulo]')?.focus({ preventScroll: true });
    pintar();
  };

  const ir = (paso: PasoId, opciones: { desdeResumen?: boolean } = {}) => {
    if (!alcanzable(paso)) return;
    if (opciones.desdeResumen) editando = true;
    mostrar(paso);
  };

  const siguiente = () => {
    const v = visibles();
    const destino = v[v.indexOf(actual) + 1];
    if (destino) mostrar(destino);
  };

  const anterior = () => {
    const v = visibles();
    const i = v.indexOf(actual);
    if (i <= 0) {
      window.location.assign('/');
      return;
    }
    mostrar(v[i - 1] as PasoId);
  };

  continuar?.addEventListener('click', () => {
    if (falta(actual) && !editor) return;
    // Editando desde el resumen, "Continuar" vuelve al resumen si ya se puede.
    if (editando && alcanzable('resumen')) {
      mostrar('resumen');
      return;
    }
    siguiente();
  });
  volver?.addEventListener('click', anterior);
  alResumen?.addEventListener('click', () => {
    if (alcanzable('resumen')) mostrar('resumen');
  });

  raiz.addEventListener('click', (event) => {
    const boton = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-ir]');
    if (!boton || boton.disabled) return;
    ir(boton.dataset.ir as PasoId, { desdeResumen: actual === 'resumen' || editando });
  });

  const pintar = () => {
    const v = visibles();
    const total = v.length;
    const indice = v.indexOf(actual);

    // Si el paso actual deja de existir (cocina al cambiar de uso), al siguiente.
    if (indice < 0) {
      mostrar(primerIncompleto(), { foco: false });
      return;
    }

    raiz.querySelectorAll<HTMLElement>('[data-cf-num]').forEach((el) => {
      const i = v.indexOf(el.dataset.cfNum as PasoId);
      el.textContent = t(catalogo, 'general.pastilla', { n: i + 1, total });
    });
    // Solo la cifra (tarjetas del resumen): se salta los pasos ocultos.
    raiz.querySelectorAll<HTMLElement>('[data-cf-num-solo]').forEach((el) => {
      const i = v.indexOf(el.dataset.cfNumSolo as PasoId);
      el.textContent = i >= 0 ? String(i + 1) : '';
      el.hidden = i < 0;
    });

    raiz.querySelectorAll<HTMLElement>('[data-cf-step]').forEach((li) => {
      const paso = li.dataset.cfStep as PasoId;
      const i = v.indexOf(paso);
      li.hidden = i < 0;
      li.classList.toggle('is-actual', paso === actual);
      li.classList.toggle('is-hecho', i >= 0 && i < indice && falta(paso) === '');
      const n = li.querySelector<HTMLElement>('[data-cf-step-n]');
      if (n) n.textContent = String(i + 1);
      const boton = li.querySelector<HTMLButtonElement>('button');
      if (boton) {
        boton.disabled = i < 0 || !alcanzable(paso);
        if (paso === actual) boton.setAttribute('aria-current', 'step');
        else boton.removeAttribute('aria-current');
      }
    });

    const movilPaso = raiz.querySelector<HTMLElement>('[data-cf-movil-paso]');
    if (movilPaso) movilPaso.textContent = t(catalogo, 'general.pastilla', { n: indice + 1, total });
    const movilEtiqueta = raiz.querySelector<HTMLElement>('[data-cf-movil-etiqueta]');
    if (movilEtiqueta) movilEtiqueta.textContent = `· ${etiqueta(actual)}`;
    const progreso = raiz.querySelector<HTMLElement>('[data-cf-progress]');
    if (progreso) progreso.style.width = `${((indice + 1) / total) * 100}%`;
    const sideProgreso = raiz.querySelector<HTMLElement>('[data-cf-side-progreso]');
    if (sideProgreso) {
      const hechos = v.filter((p) => p !== 'resumen' && p !== 'solicitud' && falta(p) === '').length;
      sideProgreso.textContent = t(catalogo, 'side.movilProgreso', { hechos, total: total - 2 });
    }

    const motivo = falta(actual);
    const enSolicitud = actual === 'solicitud';
    if (continuar) {
      continuar.hidden = enSolicitud;
      continuar.disabled = Boolean(motivo) && !editor;
    }
    if (enviar) enviar.hidden = !enSolicitud;
    if (continuarTexto) {
      continuarTexto.textContent =
        actual === 'resumen'
          ? t(catalogo, esRoadshow(store.estado) ? 'nav.solicitarRoadshow' : 'nav.solicitarDesdeResumen')
          : editando && alcanzable('resumen') && !editor
            ? t(catalogo, 'nav.guardarVolver')
            : t(catalogo, 'nav.continuar');
    }
    if (alResumen) alResumen.hidden = !editando || actual === 'resumen' || !alcanzable('resumen');
    if (pista) {
      const sig = v[indice + 1];
      pista.textContent = motivo ? motivo : sig && !enSolicitud ? t(catalogo, 'nav.siguiente', { paso: etiqueta(sig) }) : '';
      pista.classList.toggle('is-falta', Boolean(motivo));
    }
  };

  /** Paso inicial: ?paso= o el guardado, si todavia se puede llegar a el. */
  const arrancar = () => {
    const pedido = new URL(window.location.href).searchParams.get('paso') as PasoId | null;
    const candidato = pedido ?? store.pasoGuardado;
    const destino = candidato && candidato !== 'solicitud' && alcanzable(candidato) ? candidato : candidato ? primerIncompleto() : 'proyecto';
    mostrar(alcanzable(destino) ? destino : 'proyecto', { foco: false });
  };

  return { pintar, arrancar, alcanzable, visibles, actual: () => actual, primerIncompleto, mostrar };
};
