/**
 * Paso 2: calendario doble con la disponibilidad real, y el panel de estado.
 *
 * Tres modos segun el estado:
 *   known + single  -> un dia (fecha.inicio)
 *   known + range   -> periodo (inicio y fin); todos los dias deben ser reservables
 *   multiple        -> de 2 a 5 fechas sueltas (fecha.alternativas) y una elegida
 *
 * La disponibilidad se lee de /api/disponibilidad (cacheada 60 s en el CDN) y
 * se revalida en el servidor al enviar: esta comprobacion es orientativa.
 */

import {
  DISPONIBILIDAD_VACIA,
  ESTADO_TEXTO,
  MESES,
  esFechaReservable,
  estadoFecha,
  expandirRango,
  formatearFechaLarga,
  fromIso,
  primeraFechaReservable,
  toIso,
  type Disponibilidad,
} from '../../data/disponibilidad';
import type { Catalogo } from '../../data/configurador';
import { t } from '../../data/configurador-textos';
import { escribir, notificar, store } from './estado';

let dispo: Disponibilidad = DISPONIBILIDAD_VACIA;
export const getDispo = () => dispo;

export const cargarDisponibilidad = async () => {
  try {
    const response = await fetch('/api/disponibilidad', { headers: { Accept: 'application/json' } });
    if (response.ok) dispo = (await response.json()) as Disponibilidad;
  } catch {
    /* Sin red: se queda el respaldo y el servidor revalida al enviar. */
  }
  notificar();
};

const MAX_ALTERNATIVAS = 5;

/** "12 oct 2026" */
export const fechaCorta = (iso: string) => {
  const d = fromIso(iso);
  return `${d.getDate()} ${(MESES[d.getMonth()] as string).slice(0, 3).toLowerCase()} ${d.getFullYear()}`;
};

/** "12 – 16 octubre 2026" o "12 oct – 3 nov 2026" */
export const textoRango = (inicio: string, fin: string) => {
  const a = fromIso(inicio);
  const b = fromIso(fin);
  if (inicio === fin) return formatearFechaLarga(inicio);
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()} – ${b.getDate()} ${(MESES[a.getMonth()] as string).toLowerCase()} ${a.getFullYear()}`;
  }
  return `${fechaCorta(inicio)} – ${fechaCorta(fin)}`;
};

/** Proximos dias reservables a partir de una fecha, para "Ver fechas cercanas". */
const cercanas = (desde: string, cuantas = 4) => {
  const cursor = fromIso(desde);
  const resultado: string[] = [];
  for (let i = 0; i < 120 && resultado.length < cuantas; i += 1) {
    const iso = toIso(cursor);
    if (estadoFecha(iso, dispo) === 'disponible') resultado.push(iso);
    cursor.setDate(cursor.getDate() + 1);
  }
  return resultado;
};

export const iniciarCalendario = (raiz: HTMLElement, catalogo: Catalogo) => {
  const cal = raiz.querySelector<HTMLElement>('[data-cf-cal]');
  const panel = raiz.querySelector<HTMLElement>('[data-cf-dispo]');
  const listaAlternativas = raiz.querySelector<HTMLElement>('[data-cf-alternativas]');
  if (!cal || !panel) return () => {};

  const meses = [...cal.querySelectorAll<HTMLElement>('[data-cf-mes]')];
  const prev = cal.querySelector<HTMLButtonElement>('[data-cf-cal-prev]');
  const next = cal.querySelector<HTMLButtonElement>('[data-cf-cal-next]');

  const hoy = new Date();
  const primerMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const f = () => store.estado.fecha;
  const inicioVista = f().inicio ?? f().alternativas[0] ?? null;
  const vista = inicioVista ? new Date(fromIso(inicioVista).getFullYear(), fromIso(inicioVista).getMonth(), 1) : new Date(primerMes);

  /** Aviso local del panel (periodo con dias no disponibles). */
  let error = '';
  let mostrarCercanas = false;

  const ultimoMes = () => new Date(primerMes.getFullYear(), primerMes.getMonth() + dispo.mesesVisibles - 1, 1);

  const seleccionadas = (): Set<string> => {
    const e = f();
    if (e.situacion === 'multiple') return new Set(e.alternativas);
    if (e.situacion === 'known' && e.inicio) {
      if (e.modo === 'range' && e.fin) return new Set(expandirRango(e.inicio, e.fin, 60));
      return new Set([e.inicio]);
    }
    return new Set();
  };

  const pintarMes = (contenedor: HTMLElement, mes: Date) => {
    const titulo = contenedor.querySelector<HTMLElement>('[data-cf-cal-titulo]');
    const grid = contenedor.querySelector<HTMLElement>('[data-cf-cal-grid]');
    if (!grid) return;
    if (titulo) titulo.textContent = `${MESES[mes.getMonth()]} ${mes.getFullYear()}`;
    grid.setAttribute('aria-label', `${MESES[mes.getMonth()]} ${mes.getFullYear()}`);
    grid.textContent = '';

    const sel = seleccionadas();
    const e = f();
    const extremos = new Set([e.inicio, e.fin].filter(Boolean) as string[]);
    const offset = (new Date(mes.getFullYear(), mes.getMonth(), 1).getDay() + 6) % 7;
    const dias = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();

    for (let i = 0; i < offset; i += 1) grid.append(document.createElement('span'));

    for (let dia = 1; dia <= dias; dia += 1) {
      const iso = toIso(new Date(mes.getFullYear(), mes.getMonth(), dia));
      const estado = estadoFecha(iso, dispo);
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.textContent = String(dia);
      boton.dataset.dia = iso;
      boton.className = `cf-dia is-${estado}`;
      boton.disabled = !esFechaReservable(iso, dispo);
      boton.tabIndex = -1;
      const marcada = sel.has(iso);
      if (marcada) {
        const esExtremo = e.situacion !== 'known' || e.modo !== 'range' || extremos.has(iso);
        boton.classList.add(esExtremo ? 'is-sel' : 'is-rango');
      }
      if (e.situacion === 'multiple' && e.elegida === iso) boton.classList.add('is-elegida');
      boton.setAttribute('aria-pressed', String(marcada));
      boton.setAttribute('aria-label', `${formatearFechaLarga(iso)}. ${ESTADO_TEXTO[estado]}`);
      grid.append(boton);
    }

    const foco =
      grid.querySelector<HTMLButtonElement>('.is-sel:not(:disabled)') ??
      grid.querySelector<HTMLButtonElement>('button:not(:disabled)');
    if (foco) foco.tabIndex = 0;
  };

  const pintarPanel = () => {
    const e = f();
    panel.className = 'cf-dispo';
    const poner = (clase: string, titulo: string, texto: string, extra?: HTMLElement) => {
      panel.classList.add(clase);
      panel.textContent = '';
      const t = document.createElement('p');
      t.className = 'cf-dispo-titulo';
      t.textContent = titulo;
      const p = document.createElement('p');
      p.className = 'cf-dispo-texto';
      p.textContent = texto;
      panel.append(t, p);
      if (extra) panel.append(extra);
    };

    if (error) {
      const acciones = document.createElement('div');
      acciones.className = 'cf-dispo-acciones';
      const cambiar = document.createElement('button');
      cambiar.type = 'button';
      cambiar.className = 'cf-btn cf-btn-outline cf-btn-sm';
      cambiar.textContent = t(catalogo, 'fecha.msgCambiar');
      cambiar.dataset.cfAccion = 'cambiar';
      const ver = document.createElement('button');
      ver.type = 'button';
      ver.className = 'cf-btn cf-btn-outline cf-btn-sm';
      ver.textContent = t(catalogo, 'fecha.msgCercanas');
      ver.dataset.cfAccion = 'cercanas';
      acciones.append(cambiar, ver);
      if (mostrarCercanas) {
        const lista = document.createElement('div');
        lista.className = 'cf-dispo-cercanas';
        const desde = e.inicio ?? toIso(primeraFechaReservable(dispo.minDiasAntelacion));
        cercanas(desde).forEach((iso) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'cf-pill-btn';
          b.dataset.cfCercana = iso;
          b.textContent = fechaCorta(iso);
          lista.append(b);
        });
        acciones.append(lista);
      }
      poner('is-error', t(catalogo, 'fecha.msgNoDisponible'), error, acciones);
      return;
    }

    if (e.situacion === 'multiple') {
      const n = e.alternativas.length;
      if (!n) {
        poner('is-neutro', t(catalogo, 'fecha.msgVariasTitulo'), t(catalogo, 'fecha.msgVariasTexto'));
        return;
      }
      const revisar = e.alternativas.some((iso) => estadoFecha(iso, dispo) === 'poca');
      poner(
        revisar ? 'is-revisar' : 'is-ok',
        t(catalogo, 'fecha.msgVariasN', { n }),
        e.elegida
          ? t(catalogo, 'fecha.msgVariasElegida', { fecha: formatearFechaLarga(e.elegida).toLowerCase() })
          : n < 2
            ? t(catalogo, 'fecha.msgOtraFecha')
            : t(catalogo, 'fecha.msgEligeAbajo'),
      );
      return;
    }

    if (!e.inicio) {
      poner('is-neutro', t(catalogo, 'fecha.msgElige'), t(catalogo, 'fecha.msgEligeTexto'));
      return;
    }
    if (e.modo === 'range' && !e.fin) {
      poner('is-neutro', t(catalogo, 'fecha.msgDesde', { fecha: fechaCorta(e.inicio) }), t(catalogo, 'fecha.msgDesdeTexto'));
      return;
    }

    const fechas = [...seleccionadas()];
    const revisar = fechas.some((iso) => estadoFecha(iso, dispo) === 'poca');
    const texto = e.modo === 'range' && e.fin ? `${textoRango(e.inicio, e.fin)} (${fechas.length} días)` : formatearFechaLarga(e.inicio);
    if (revisar) {
      poner('is-revisar', t(catalogo, 'fecha.msgRevisar', { fechas: texto }), t(catalogo, 'fecha.msgRevisarTexto'));
    } else {
      poner('is-ok', t(catalogo, 'fecha.msgDisponible', { fechas: texto }), t(catalogo, 'fecha.msgDisponibleTexto'));
    }
  };

  const pintarAlternativas = () => {
    if (!listaAlternativas) return;
    const e = f();
    listaAlternativas.textContent = '';
    e.alternativas.forEach((iso) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cf-alt';
      b.dataset.elegir = 'fecha.elegida';
      b.dataset.valor = iso;
      b.setAttribute('aria-pressed', String(e.elegida === iso));
      const estado = t(catalogo, estadoFecha(iso, dispo) === 'poca' ? 'fecha.leyendaRevisar' : 'fecha.leyendaDisponible');
      b.innerHTML = '<span class="cf-radio" aria-hidden="true"></span>';
      const txt = document.createElement('span');
      txt.textContent = `${formatearFechaLarga(iso)} · ${estado}`;
      b.append(txt);
      listaAlternativas.append(b);
    });
  };

  const pintar = () => {
    if (vista < primerMes) vista.setTime(primerMes.getTime());
    meses.forEach((m, i) => pintarMes(m, new Date(vista.getFullYear(), vista.getMonth() + i, 1)));
    if (prev) prev.disabled = vista <= primerMes;
    if (next) next.disabled = new Date(vista.getFullYear(), vista.getMonth() + 1, 1) >= ultimoMes();
    pintarPanel();
    pintarAlternativas();
  };

  prev?.addEventListener('click', () => {
    vista.setMonth(vista.getMonth() - 1);
    pintar();
  });
  next?.addEventListener('click', () => {
    vista.setMonth(vista.getMonth() + 1);
    pintar();
  });

  const elegirDia = (iso: string) => {
    const e = f();
    error = '';
    mostrarCercanas = false;

    if (e.situacion === 'multiple') {
      if (e.alternativas.includes(iso)) {
        escribir('fecha.alternativas', e.alternativas.filter((x) => x !== iso), catalogo);
        if (e.elegida === iso) escribir('fecha.elegida', null, catalogo);
      } else if (e.alternativas.length < MAX_ALTERNATIVAS) {
        escribir('fecha.alternativas', [...e.alternativas, iso].sort(), catalogo);
      }
      return;
    }

    if (e.modo === 'single' || !e.inicio || e.fin || iso < e.inicio) {
      escribir('fecha.inicio', iso, catalogo);
      escribir('fecha.fin', null, catalogo);
      if (e.modo === 'single') escribir('fecha.fin', null, catalogo);
      return;
    }

    const rango = expandirRango(e.inicio, iso, 60);
    const malos = rango.filter((d) => !esFechaReservable(d, dispo));
    if (malos.length) {
      error = t(catalogo, 'fecha.msgPeriodoMalo', { dias: malos.map(fechaCorta).join(', ') });
      notificar();
      return;
    }
    escribir('fecha.fin', iso, catalogo);
  };

  cal.addEventListener('click', (event) => {
    const dia = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-dia]');
    if (!dia || dia.disabled) return;
    elegirDia(dia.dataset.dia as string);
    queueMicrotask(() => cal.querySelector<HTMLButtonElement>(`button[data-dia="${dia.dataset.dia}"]`)?.focus());
  });

  /* Flechas dentro de un mes: una sola parada de tabulador por rejilla. */
  cal.addEventListener('keydown', (event) => {
    const salto: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (!(event.key in salto)) return;
    const grid = (event.target as HTMLElement).closest('[data-cf-cal-grid]');
    if (!grid) return;
    const dias = [...grid.querySelectorAll<HTMLButtonElement>('button[data-dia]')];
    const i = dias.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    event.preventDefault();
    const destino = dias[Math.min(Math.max(i + (salto[event.key] as number), 0), dias.length - 1)];
    dias.forEach((d) => (d.tabIndex = -1));
    if (destino) {
      destino.tabIndex = 0;
      destino.focus();
    }
  });

  panel.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const accion = target.closest<HTMLElement>('[data-cf-accion]')?.dataset.cfAccion;
    if (accion === 'cambiar') {
      error = '';
      escribir('fecha.inicio', null, catalogo);
      escribir('fecha.fin', null, catalogo);
      return;
    }
    if (accion === 'cercanas') {
      mostrarCercanas = true;
      pintarPanel();
      return;
    }
    const cercana = target.closest<HTMLElement>('[data-cf-cercana]')?.dataset.cfCercana;
    if (cercana) {
      error = '';
      escribir('fecha.modo', 'single', catalogo);
      escribir('fecha.inicio', cercana, catalogo);
      escribir('fecha.fin', null, catalogo);
      const d = fromIso(cercana);
      vista.setFullYear(d.getFullYear(), d.getMonth(), 1);
    }
  });

  return pintar;
};
