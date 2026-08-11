/**
 * Disponibilidad del food truck para el asistente de reserva.
 *
 * PARA EDITAR: anadir o quitar fechas en `fechasOcupadas` y
 * `fechasPocaDisponibilidad`, siempre en formato ISO local `AAAA-MM-DD`. Todo
 * lo que no este en esas listas se considera disponible. Los cambios requieren
 * volver a desplegar la web (el sitio es estatico, no hay base de datos).
 *
 * Los nombres de mes y dia estan escritos a mano y no con Intl: el mismo modulo
 * lo usan el navegador y la ruta /api/presupuesto, y el Node del build no
 * siempre trae ICU completo (por eso `formatPrice` de ./configuraciones tampoco
 * usa toLocaleString).
 */

/** Fechas ya reservadas: no se pueden seleccionar. */
export const fechasOcupadas: string[] = [];

/** Fechas casi cerradas: se pueden seleccionar, pero avisan al usuario. */
export const fechasPocaDisponibilidad: string[] = [];

/** Dias minimos entre hoy y la fecha del evento. */
export const MIN_DIAS_ANTELACION = 7;

/** Meses que se pueden navegar hacia delante desde el mes actual. */
export const MESES_VISIBLES = 12;

export const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/** Cabecera del calendario. Empieza en lunes, como el calendario espanol. */
export const DIAS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

/** Indexado por getDay(): 0 = domingo. */
const DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export type EstadoFecha = 'disponible' | 'poca' | 'ocupado' | 'bloqueado';

/** Texto para el aria-label de cada dia del calendario. */
export const ESTADO_TEXTO: Record<EstadoFecha, string> = {
  disponible: 'Seleccionable, disponibilidad a confirmar',
  poca: 'Poca disponibilidad',
  ocupado: 'No disponible',
  bloqueado: 'Fuera de plazo',
};

/**
 * Rotulo visible bajo el numero del dia. `disponible` va vacio a proposito:
 * mientras `fechasOcupadas` no se mantenga al dia, el calendario no puede
 * afirmar que una fecha esta libre. La confirmacion real llega por correo en
 * menos de 24 horas, y eso es lo que dicen el paso 1 y el acuse del asistente.
 */
export const ESTADO_ETIQUETA: Record<EstadoFecha, string> = {
  disponible: '',
  poca: 'Poca disponibilidad',
  ocupado: 'No disponible',
  bloqueado: '',
};

const pad = (value: number) => String(value).padStart(2, '0');

/** ISO local: no se usa toISOString porque convierte a UTC y adelanta el dia. */
export const toIso = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Parsea AAAA-MM-DD como fecha local (new Date('...') la interpretaria en UTC). */
export const fromIso = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year as number, (month as number) - 1, day as number);
};

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Primer dia que se puede reservar: hoy mas los dias de antelacion minima. */
export const primeraFechaReservable = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + MIN_DIAS_ANTELACION);
  return date;
};

export const estadoFecha = (iso: string): EstadoFecha => {
  if (!ISO_RE.test(iso)) return 'bloqueado';
  if (fromIso(iso) < primeraFechaReservable()) return 'bloqueado';
  if (fechasOcupadas.includes(iso)) return 'ocupado';
  if (fechasPocaDisponibilidad.includes(iso)) return 'poca';
  return 'disponible';
};

/** Se puede elegir en el calendario y aceptar en el servidor. */
export const esFechaReservable = (iso: string) => {
  const estado = estadoFecha(iso);
  return estado === 'disponible' || estado === 'poca';
};

/** 2026-06-28 -> 28/06/2026 */
export const formatearFecha = (iso: string) => {
  if (!ISO_RE.test(iso)) return iso;
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
};

/** 2026-06-28 -> Viernes, 28 de junio de 2026 */
export const formatearFechaLarga = (iso: string) => {
  if (!ISO_RE.test(iso)) return iso;
  const date = fromIso(iso);
  const diaSemana = DIAS_LARGOS[date.getDay()] as string;
  const mes = (MESES[date.getMonth()] as string).toLowerCase();
  return `${diaSemana}, ${date.getDate()} de ${mes} de ${date.getFullYear()}`;
};
