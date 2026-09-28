/**
 * Panel de disponibilidad (/admin).
 *
 * Modelo mental: hay un estado "guardado" (lo que hay en Supabase) y un estado
 * "en pantalla". Los clics solo tocan el segundo, y el boton Guardar manda la
 * diferencia. Nada de autoguardado: un clic accidental no puede cerrarle un dia
 * al cliente sin que se entere.
 */

import { rutaPanel } from './admin-rutas';

import {
  DISPONIBILIDAD_VACIA,
  LIMITES,
  MESES,
  esIsoValido,
  expandirRango,
  formatearFechaLarga,
  fromIso,
  primeraFechaReservable,
  toIso,
  type Disponibilidad,
  type EstadoEditable,
} from '../data/disponibilidad';

const grid = document.querySelector<HTMLElement>('[data-cal-grid]');
const monthSelect = document.querySelector<HTMLSelectElement>('[data-cal-month]');
const prevButton = document.querySelector<HTMLButtonElement>('[data-cal-prev]');
const nextButton = document.querySelector<HTMLButtonElement>('[data-cal-next]');

const minDiasInput = document.querySelector<HTMLInputElement>('[data-min-dias]');
const mesesInput = document.querySelector<HTMLInputElement>('[data-meses-visibles]');

const rangoDesde = document.querySelector<HTMLInputElement>('[data-rango-desde]');
const rangoHasta = document.querySelector<HTMLInputElement>('[data-rango-hasta]');
const rangoEstado = document.querySelector<HTMLSelectElement>('[data-rango-estado]');
const rangoAplicar = document.querySelector<HTMLButtonElement>('[data-rango-aplicar]');
const rangoStatus = document.querySelector<HTMLElement>('[data-rango-status]');

const avisoPlazo = document.querySelector<HTMLElement>('[data-aviso-plazo]');
const saveStatus = document.querySelector<HTMLElement>('[data-save-status]');
const guardarButton = document.querySelector<HTMLButtonElement>('[data-guardar]');
const descartarButton = document.querySelector<HTMLButtonElement>('[data-descartar]');

const inicial = document.querySelector<HTMLScriptElement>('[data-dispo-inicial]');

if (grid && inicial) {
  /** Lo que hay guardado en Supabase, tal y como llego al cargar la pagina. */
  let guardado: Disponibilidad = DISPONIBILIDAD_VACIA;
  try {
    guardado = JSON.parse(inicial.textContent ?? '') as Disponibilidad;
  } catch {
    /* Se queda en el fallback: el panel sigue usable y Guardar lo corregira. */
  }

  /** Fecha -> estado. Solo las que el cliente ha marcado; el resto es libre. */
  type Marcas = Map<string, EstadoEditable>;

  const aMarcas = (dispo: Disponibilidad): Marcas => {
    const marcas: Marcas = new Map();
    dispo.ocupadas.forEach((iso) => marcas.set(iso, 'ocupado'));
    dispo.poca.forEach((iso) => marcas.set(iso, 'poca'));
    return marcas;
  };

  let marcasGuardadas = aMarcas(guardado);
  let marcas: Marcas = new Map(marcasGuardadas);

  /* --------------------------------------------------- Cambios pendientes */

  const ajustesActuales = () => ({
    minDiasAntelacion: Number(minDiasInput?.value ?? guardado.minDiasAntelacion),
    mesesVisibles: Number(mesesInput?.value ?? guardado.mesesVisibles),
  });

  /** Fechas cuyo estado difiere de lo guardado. Es lo unico que se manda. */
  const fechasSucias = () => {
    const sucias = new Set<string>();
    for (const [iso, estado] of marcas) {
      if (marcasGuardadas.get(iso) !== estado) sucias.add(iso);
    }
    for (const iso of marcasGuardadas.keys()) {
      if (!marcas.has(iso)) sucias.add(iso);
    }
    return sucias;
  };

  const ajustesSucios = () => {
    const { minDiasAntelacion, mesesVisibles } = ajustesActuales();
    return (
      minDiasAntelacion !== guardado.minDiasAntelacion || mesesVisibles !== guardado.mesesVisibles
    );
  };

  const setSaveStatus = (message: string, state: 'error' | 'success' | '' = '') => {
    if (!saveStatus) return;
    saveStatus.textContent = message;
    saveStatus.classList.toggle('is-error', state === 'error');
    saveStatus.classList.toggle('is-success', state === 'success');
  };

  const refrescarBarra = () => {
    const dias = fechasSucias().size;
    const ajustes = ajustesSucios();
    const hayCambios = dias > 0 || ajustes;

    if (guardarButton) guardarButton.disabled = !hayCambios;
    if (descartarButton) descartarButton.disabled = !hayCambios;

    if (!hayCambios) {
      setSaveStatus('Sin cambios pendientes.');
      return;
    }

    const partes: string[] = [];
    if (dias) partes.push(dias === 1 ? '1 día modificado' : `${dias} días modificados`);
    if (ajustes) partes.push('ajustes modificados');
    setSaveStatus(`${partes.join(' y ')}. Sin guardar.`);
  };

  /* --------------------------------------------------- Calendario */

  /** Mes que se esta viendo. Siempre el dia 1, para operar con setMonth(). */
  const view = new Date();
  view.setDate(1);
  view.setHours(0, 0, 0, 0);

  const firstMonth = new Date(view);
  let lastMonth = new Date(firstMonth);

  const monthKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

  /*
   * El panel deja navegar mas alla de los meses que ve el visitante: el cliente
   * tiene que poder cerrar un dia de dentro de dos anos aunque hoy solo muestre
   * doce meses. Por eso el margen sobre `mesesVisibles`.
   */
  const buildMonths = () => {
    const meses = Math.max(ajustesActuales().mesesVisibles, 12) + 12;
    lastMonth = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + meses, 1);

    if (!monthSelect) return;
    const actual = monthSelect.value;
    monthSelect.textContent = '';
    const cursor = new Date(firstMonth);
    while (cursor <= lastMonth) {
      const option = document.createElement('option');
      option.value = monthKey(cursor);
      option.textContent = `${MESES[cursor.getMonth()]} ${cursor.getFullYear()}`;
      monthSelect.append(option);
      cursor.setMonth(cursor.getMonth() + 1);
    }
    if (actual) monthSelect.value = actual;
  };

  /** Celda vacia de los meses vecinos: rellena la semana sin ser clicable. */
  const relleno = (day: number) => {
    const cell = document.createElement('span');
    cell.className = 'cal-day is-relleno';
    cell.textContent = String(day);
    cell.setAttribute('aria-hidden', 'true');
    return cell;
  };

  const ETIQUETA: Record<EstadoEditable, string> = {
    ocupado: 'Ocupado',
    poca: 'Poca dispon.',
  };

  const renderMonth = () => {
    grid.textContent = '';

    const year = view.getFullYear();
    const month = view.getMonth();
    // getDay() empieza en domingo; el calendario espanol, en lunes.
    const offset = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();

    const limite = primeraFechaReservable(ajustesActuales().minDiasAntelacion);
    const sucias = fechasSucias();

    for (let i = offset; i > 0; i -= 1) grid.append(relleno(daysInPrev - i + 1));

    for (let day = 1; day <= daysInMonth; day += 1) {
      const iso = toIso(new Date(year, month, day));
      const estado = marcas.get(iso);
      const fueraDePlazo = fromIso(iso) < limite;

      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cal-day';
      cell.dataset.day = iso;
      cell.tabIndex = -1;

      if (estado === 'ocupado') cell.classList.add('is-admin-ocupado');
      else if (estado === 'poca') cell.classList.add('is-admin-poca');
      if (sucias.has(iso)) cell.classList.add('is-sucio');

      /*
       * Los dias fuera de plazo se pueden marcar igual: la antelacion minima es
       * un ajuste que el cliente puede bajar en cualquier momento, y entonces
       * esas marcas tienen que estar ya puestas.
       *
       * Pero se marcan en gris con rayas, porque en la web esos dias YA salen
       * bloqueados por la antelacion: estadoFecha() comprueba el plazo antes que
       * el estado, asi que marcarlos ahi no cambia nada de lo que ve el
       * visitante. Sin esta senal parece que el panel no guarda.
       */
      if (fueraDePlazo) cell.classList.add('is-fuera-plazo');

      const textoEstado = estado ? ETIQUETA[estado] : 'Libre';
      cell.setAttribute(
        'aria-label',
        `${formatearFechaLarga(iso)}. ${textoEstado}${fueraDePlazo ? '. Fuera de plazo' : ''}`,
      );
      cell.setAttribute('aria-pressed', String(Boolean(estado)));

      const numero = document.createElement('span');
      numero.textContent = String(day);
      const etiqueta = document.createElement('small');
      etiqueta.textContent = estado ? ETIQUETA[estado] : '';

      cell.append(numero, etiqueta);
      grid.append(cell);
    }

    const trailing = (7 - ((offset + daysInMonth) % 7)) % 7;
    for (let day = 1; day <= trailing; day += 1) grid.append(relleno(day));

    // Tabulador: una sola parada en la rejilla.
    const roving = grid.querySelector<HTMLButtonElement>('button[data-day]');
    if (roving) roving.tabIndex = 0;

    if (monthSelect) monthSelect.value = monthKey(view);
    if (prevButton) prevButton.disabled = view <= firstMonth;
    if (nextButton) nextButton.disabled = view >= lastMonth;
  };

  /**
   * Avisa de las marcas que caen dentro de la antelacion minima. Ahi el
   * visitante ve "fuera de plazo" haga lo que haga el panel, asi que sin este
   * aviso el cliente marca dias, mira la web, no ve ningun cambio y concluye
   * que el panel no funciona.
   */
  const refrescarAvisoPlazo = () => {
    if (!avisoPlazo) return;

    const limite = primeraFechaReservable(ajustesActuales().minDiasAntelacion);
    const dentro = [...marcas.keys()].filter((iso) => fromIso(iso) < limite);

    if (dentro.length === 0) {
      avisoPlazo.hidden = true;
      return;
    }

    const dias = ajustesActuales().minDiasAntelacion;
    avisoPlazo.hidden = false;
    avisoPlazo.textContent =
      `${dentro.length === 1 ? 'Hay 1 día marcado' : `Hay ${dentro.length} días marcados`} ` +
      `dentro de los ${dias} días de antelación mínima (hasta el ${formatearFechaLarga(toIso(limite))}). ` +
      'En la web esos días ya salen bloqueados por el plazo, así que marcarlos no cambia lo que ve el visitante. ' +
      'Se guardan igual, y contarán si algún día bajas la antelación mínima.';
  };

  const repintar = () => {
    renderMonth();
    refrescarBarra();
    refrescarAvisoPlazo();
  };

  const moveMonth = (delta: number) => {
    const target = new Date(view.getFullYear(), view.getMonth() + delta, 1);
    if (target < firstMonth || target > lastMonth) return;
    view.setMonth(view.getMonth() + delta);
    renderMonth();
  };

  prevButton?.addEventListener('click', () => moveMonth(-1));
  nextButton?.addEventListener('click', () => moveMonth(1));

  monthSelect?.addEventListener('change', () => {
    const [year, month] = monthSelect.value.split('-').map(Number);
    view.setFullYear(year as number, (month as number) - 1, 1);
    renderMonth();
  });

  /** libre -> ocupado -> poca -> libre. */
  const siguienteEstado = (estado?: EstadoEditable): EstadoEditable | undefined => {
    if (!estado) return 'ocupado';
    if (estado === 'ocupado') return 'poca';
    return undefined;
  };

  grid.addEventListener('click', (event) => {
    const cell = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-day]');
    if (!cell) return;

    const iso = cell.dataset.day as string;
    const siguiente = siguienteEstado(marcas.get(iso));
    if (siguiente) marcas.set(iso, siguiente);
    else marcas.delete(iso);

    repintar();
    grid.querySelector<HTMLButtonElement>(`button[data-day="${iso}"]`)?.focus();
  });

  /** Flechas, Inicio y Fin mueven el foco por la rejilla sin salir del mes. */
  grid.addEventListener('keydown', (event) => {
    const keys: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    const cells = [...grid.querySelectorAll<HTMLButtonElement>('button[data-day]')];
    const index = cells.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;

    let target = -1;
    if (event.key in keys) target = index + (keys[event.key] as number);
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = cells.length - 1;
    else return;

    event.preventDefault();
    const cell = cells[Math.min(Math.max(target, 0), cells.length - 1)];
    if (!cell) return;
    cells.forEach((el) => (el.tabIndex = -1));
    cell.tabIndex = 0;
    cell.focus();
  });

  /* --------------------------------------------------- Rangos */

  const setRangoStatus = (message: string, state: 'error' | '' = '') => {
    if (!rangoStatus) return;
    rangoStatus.textContent = message;
    rangoStatus.classList.toggle('is-error', state === 'error');
  };

  rangoAplicar?.addEventListener('click', () => {
    const desde = rangoDesde?.value ?? '';
    const hasta = rangoHasta?.value ?? '';

    if (!esIsoValido(desde) || !esIsoValido(hasta)) {
      setRangoStatus('Indica las dos fechas del periodo.', 'error');
      return;
    }

    const fechas = expandirRango(desde, hasta);
    if (fechas.length === 0) {
      setRangoStatus('La fecha «hasta» tiene que ser igual o posterior a «desde».', 'error');
      return;
    }

    const estado = rangoEstado?.value ?? 'ocupado';
    for (const iso of fechas) {
      if (estado === 'libre') marcas.delete(iso);
      else marcas.set(iso, estado as EstadoEditable);
    }

    // Lleva la vista al periodo tocado: si no, el cambio pasa desapercibido.
    const primera = fromIso(fechas[0] as string);
    view.setFullYear(primera.getFullYear(), primera.getMonth(), 1);

    repintar();
    setRangoStatus(
      `${fechas.length} ${fechas.length === 1 ? 'día marcado' : 'días marcados'}. Revísalo y pulsa Guardar.`,
    );
  });

  /* --------------------------------------------------- Ajustes */

  const limitar = (input: HTMLInputElement | null, { min, max }: { min: number; max: number }) => {
    if (!input) return;
    const value = Number(input.value);
    if (!Number.isFinite(value)) return;
    input.value = String(Math.min(Math.max(Math.round(value), min), max));
  };

  minDiasInput?.addEventListener('change', () => {
    limitar(minDiasInput, LIMITES.minDiasAntelacion);
    repintar();
  });

  mesesInput?.addEventListener('change', () => {
    limitar(mesesInput, LIMITES.mesesVisibles);
    buildMonths();
    repintar();
  });

  /* --------------------------------------------------- Guardar */

  descartarButton?.addEventListener('click', () => {
    marcas = new Map(marcasGuardadas);
    if (minDiasInput) minDiasInput.value = String(guardado.minDiasAntelacion);
    if (mesesInput) mesesInput.value = String(guardado.mesesVisibles);
    buildMonths();
    repintar();
    setRangoStatus('');
  });

  guardarButton?.addEventListener('click', async () => {
    const sucias = [...fechasSucias()];
    const ajustes = ajustesActuales();

    guardarButton.disabled = true;
    setSaveStatus('Guardando…');

    /*
     * Se manda solo lo que ha cambiado, con su estado final. `null` significa
     * "borrar la fila": asi el servidor no tiene que adivinar nada.
     */
    const cambios = sucias.map((fecha) => ({ fecha, estado: marcas.get(fecha) ?? null }));

    try {
      const response = await fetch(rutaPanel('/api/disponibilidad'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cambios, ajustes }),
      });

      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string };

      // Sin sesion, las APIs del panel responden 404 para no delatarse.
      if (response.status === 401 || response.status === 404) {
        setSaveStatus('Tu sesión ha caducado. Vuelve a entrar.', 'error');
        window.setTimeout(() => window.location.assign(rutaPanel('/login')), 1500);
        return;
      }

      if (!response.ok || !data.ok) {
        setSaveStatus(data.message ?? 'No se pudo guardar. Inténtalo de nuevo.', 'error');
        guardarButton.disabled = false;
        return;
      }

      // Lo de pantalla pasa a ser lo guardado: ya no hay cambios pendientes.
      guardado = { ...guardado, ...ajustes };
      marcasGuardadas = new Map(marcas);
      repintar();
      setSaveStatus('Cambios guardados. Se verán en la web en menos de un minuto.', 'success');
    } catch (error) {
      console.error('[admin] Error al guardar:', error);
      setSaveStatus('No hay conexión. Los cambios siguen aquí, vuelve a intentarlo.', 'error');
      guardarButton.disabled = false;
    }
  });

  /* Salir con cambios sin guardar es la unica forma de perder trabajo aqui. */
  window.addEventListener('beforeunload', (event) => {
    if (fechasSucias().size === 0 && !ajustesSucios()) return;
    // preventDefault() basta en los navegadores actuales; returnValue esta obsoleto.
    event.preventDefault();
  });

  buildMonths();
  repintar();
}

export {};
