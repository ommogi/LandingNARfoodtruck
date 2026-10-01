/**
 * Roadshow: paradas (ciudad + fecha) en el paso 2 y sus datos logisticos en el
 * paso 8. Las filas se crean con el DOM porque su numero cambia; se reconstruyen
 * solo cuando cambia el numero de paradas, para no robar el foco al escribir.
 */

import { esFechaReservable, estadoFecha, primeraFechaReservable, toIso } from '../../data/disponibilidad';
import { opcionesDe, paradaVacia, type Catalogo, type Parada } from '../../data/configurador';
import { t } from '../../data/configurador-textos';
import { getDispo, fechaCorta } from './calendario';
import { notificar, store } from './estado';

const MAX_PARADAS = 12;

const crear = <K extends keyof HTMLElementTagNameMap>(tag: K, clase = '', texto = '') => {
  const el = document.createElement(tag);
  if (clase) el.className = clase;
  if (texto) el.textContent = texto;
  return el;
};

const campoTexto = (i: number, campo: keyof Parada, etiqueta: string, tipo = 'text', extra: Record<string, string> = {}) => {
  const label = crear('label', 'cf-campo');
  label.append(crear('span', 'cf-label', etiqueta));
  const input = crear('input', 'field');
  input.type = tipo;
  input.dataset.paradaI = String(i);
  input.dataset.paradaCampo = campo;
  Object.entries(extra).forEach(([k, v]) => input.setAttribute(k, v));
  label.append(input);
  return label;
};

const campoSelect = (i: number, campo: keyof Parada, etiqueta: string, opciones: { id: string; nombre: string }[], vacia: string) => {
  const label = crear('label', 'cf-campo');
  label.append(crear('span', 'cf-label', etiqueta));
  const select = crear('select', 'field field-select');
  select.dataset.paradaI = String(i);
  select.dataset.paradaCampo = campo;
  select.append(new Option(vacia, ''));
  opciones.forEach((o) => select.append(new Option(o.nombre, o.id)));
  label.append(select);
  return label;
};

export const iniciarParadas = (raiz: HTMLElement, catalogo: Catalogo) => {
  const lista = raiz.querySelector<HTMLElement>('[data-cf-paradas]');
  const logistica = raiz.querySelector<HTMLElement>('[data-cf-paradas-logistica]');
  const anadir = raiz.querySelector<HTMLButtonElement>('[data-cf-parada-anadir]');
  const paradas = () => store.estado.fecha.paradas;
  const espacios = opcionesDe(catalogo, 'espacio');
  const accesos = opcionesDe(catalogo, 'acceso');

  let pintadasPaso2 = -1;
  let pintadasPaso8 = -1;

  const construirPaso2 = () => {
    if (!lista) return;
    lista.textContent = '';
    const minimo = toIso(primeraFechaReservable(getDispo().minDiasAntelacion));
    paradas().forEach((_, i) => {
      const li = crear('li', 'cf-parada');
      li.append(crear('span', 'cf-num', String(i + 1).padStart(2, '0')));
      li.append(campoTexto(i, 'ciudad', t(catalogo, 'fecha.ciudad'), 'text', { maxlength: '80', autocomplete: 'off' }));
      li.append(campoTexto(i, 'fecha', t(catalogo, 'fecha.fechaParada'), 'date', { min: minimo, 'data-dp-disponibilidad': '' }));
      const estado = crear('span', 'cf-parada-estado');
      estado.dataset.paradaEstado = String(i);
      li.append(estado);
      const quitar = crear('button', 'cf-parada-quitar');
      quitar.type = 'button';
      quitar.dataset.paradaQuitar = String(i);
      quitar.setAttribute('aria-label', `Quitar la parada ${i + 1}`);
      quitar.textContent = '×';
      quitar.disabled = paradas().length <= 2;
      li.append(quitar);
      lista.append(li);
    });
    pintadasPaso2 = paradas().length;
  };

  const construirPaso8 = () => {
    if (!logistica) return;
    logistica.textContent = '';
    paradas().forEach((_, i) => {
      const det = crear('details', 'cf-parada-log');
      det.setAttribute('name', 'cf-parada');
      if (i === 0) det.open = true;
      const sum = crear('summary');
      sum.append(crear('span', 'cf-num', String(i + 1).padStart(2, '0')));
      const titulo = crear('span', 'cf-parada-titulo');
      titulo.dataset.paradaTitulo = String(i);
      sum.append(titulo);
      const pend = crear('span', 'cf-parada-pendiente');
      pend.dataset.paradaPendiente = String(i);
      sum.append(pend);
      det.append(sum);

      const cuerpo = crear('div', 'cf-form-grid');
      cuerpo.append(
        campoTexto(i, 'direccion', t(catalogo, 'logistica.direccion'), 'text', { maxlength: '160' }),
        campoTexto(i, 'cp', t(catalogo, 'logistica.cp'), 'text', { maxlength: '5', inputmode: 'numeric' }),
        campoTexto(i, 'inicio', t(catalogo, 'logistica.inicio'), 'time'),
        campoTexto(i, 'fin', t(catalogo, 'logistica.fin'), 'time'),
        campoTexto(i, 'asistentes', t(catalogo, 'logistica.paradaAsistentes'), 'number', { min: '1', inputmode: 'numeric' }),
        campoSelect(i, 'espacio', t(catalogo, 'logistica.paradaEspacio'), espacios, t(catalogo, 'logistica.provinciaVacia')),
        campoSelect(i, 'acceso', t(catalogo, 'logistica.paradaAcceso'), accesos, t(catalogo, 'logistica.provinciaVacia')),
      );
      const notas = campoTexto(i, 'notas', t(catalogo, 'logistica.paradaNotas'), 'text', { maxlength: '300' });
      notas.classList.add('is-ancho');
      cuerpo.append(notas);
      det.append(cuerpo);
      logistica.append(det);
    });
    pintadasPaso8 = paradas().length;
  };

  raiz.addEventListener('input', (event) => {
    const el = event.target as HTMLInputElement | HTMLSelectElement;
    const i = el.dataset?.paradaI;
    const campo = el.dataset?.paradaCampo as keyof Parada | undefined;
    if (i === undefined || !campo) return;
    const parada = paradas()[Number(i)];
    if (!parada) return;
    if (campo === 'asistentes') {
      const n = Number.parseInt(el.value, 10);
      parada.asistentes = Number.isFinite(n) && n > 0 ? n : null;
    } else if (campo === 'fecha' || campo === 'espacio' || campo === 'acceso') {
      (parada[campo] as string | null) = el.value || null;
    } else {
      (parada[campo] as string) = el.value;
    }
    notificar();
  });
  raiz.addEventListener('change', (event) => {
    // Los <select> y algunos date pickers solo emiten change.
    const el = event.target as HTMLElement;
    if (el.dataset?.paradaI !== undefined) el.dispatchEvent(new Event('input', { bubbles: true }));
  });

  raiz.addEventListener('click', (event) => {
    const quitar = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-parada-quitar]');
    if (!quitar) return;
    paradas().splice(Number(quitar.dataset.paradaQuitar), 1);
    notificar();
  });

  anadir?.addEventListener('click', () => {
    if (paradas().length >= MAX_PARADAS) return;
    paradas().push(paradaVacia());
    notificar();
    queueMicrotask(() => lista?.querySelector<HTMLInputElement>('li:last-child input')?.focus());
  });

  return () => {
    if (pintadasPaso2 !== paradas().length) construirPaso2();
    if (pintadasPaso8 !== paradas().length) construirPaso8();
    if (anadir) anadir.disabled = paradas().length >= MAX_PARADAS;

    const dispo = getDispo();
    raiz.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-parada-i]').forEach((el) => {
      if (el === document.activeElement) return;
      const valor = paradas()[Number(el.dataset.paradaI)]?.[el.dataset.paradaCampo as keyof Parada];
      el.value = valor === null || valor === undefined ? '' : String(valor);
    });

    paradas().forEach((p, i) => {
      const estado = raiz.querySelector<HTMLElement>(`[data-parada-estado="${i}"]`);
      if (estado) {
        const e = p.fecha ? estadoFecha(p.fecha, dispo) : null;
        estado.className = `cf-parada-estado${e ? ` is-${e}` : ''}`;
        estado.textContent = !p.fecha
          ? ''
          : !esFechaReservable(p.fecha, dispo)
            ? t(catalogo, 'fecha.leyendaNo')
            : e === 'poca'
              ? t(catalogo, 'fecha.leyendaRevisar')
              : t(catalogo, 'fecha.leyendaDisponible');
      }
      const titulo = raiz.querySelector<HTMLElement>(`[data-parada-titulo="${i}"]`);
      if (titulo) titulo.textContent = [p.ciudad || `Parada ${i + 1}`, p.fecha ? fechaCorta(p.fecha) : ''].filter(Boolean).join(' · ');
      const pend = raiz.querySelector<HTMLElement>(`[data-parada-pendiente="${i}"]`);
      if (pend) pend.textContent = t(catalogo, p.direccion && p.inicio ? 'logistica.paradaCompleta' : 'logistica.paradaPendiente');
    });
  };
};
