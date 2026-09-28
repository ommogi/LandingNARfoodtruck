/**
 * Logica de disponibilidad del food truck para el asistente de reserva.
 *
 * Este modulo es PURO y se empaqueta en el bundle del navegador (lo importa
 * src/scripts/booking.ts). No puede tocar la base de datos ni leer secretos: las
 * funciones reciben los datos ya cargados en un objeto `Disponibilidad`.
 *
 * Quien los carga:
 *   - navegador -> GET /api/disponibilidad (src/pages/api/disponibilidad.ts)
 *   - servidor   -> getDisponibilidad() de src/lib/disponibilidad-server.ts
 *
 * El cliente gestiona las fechas desde /admin y los cambios se ven sin volver a
 * desplegar. Si Supabase no responde se usa DISPONIBILIDAD_VACIA y el calendario
 * se comporta como antes de existir la base de datos: nada bloqueado salvo la
 * antelacion minima.
 *
 * Los nombres de mes y dia estan escritos a mano y no con Intl: el mismo modulo
 * lo usan el navegador y la ruta /api/presupuesto, y el Node del build no
 * siempre trae ICU completo (por eso `formatPrice` de ./configuraciones tampoco
 * usa toLocaleString).
 */

/** Estado de las fechas que el cliente marca a mano en /admin. */
export type EstadoEditable = 'ocupado' | 'poca';

/** Instantanea de la disponibilidad. Serializable a JSON tal cual. */
export type Disponibilidad = {
  /** Fechas ya reservadas: no se pueden seleccionar. */
  ocupadas: string[];
  /** Fechas casi cerradas: se pueden seleccionar, pero avisan al usuario. */
  poca: string[];
  /** Dias minimos entre hoy y la fecha del evento. */
  minDiasAntelacion: number;
  /** Meses que se pueden navegar hacia delante desde el mes actual. */
  mesesVisibles: number;
};

/** Valores por defecto y red de seguridad si la base de datos no responde. */
export const DISPONIBILIDAD_VACIA: Disponibilidad = {
  ocupadas: [],
  poca: [],
  minDiasAntelacion: 7,
  mesesVisibles: 12,
};

/** Limites de los ajustes. Replican los CHECK de la tabla `ajustes`. */
export const LIMITES = {
  minDiasAntelacion: { min: 0, max: 90 },
  mesesVisibles: { min: 1, max: 24 },
} as const;

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
 * aunque el cliente ya puede mantener las fechas desde /admin, el calendario no
 * afirma que una fecha este libre hasta que ese habito este asentado. La
 * confirmacion real llega por correo en menos de 24 horas, y eso es lo que dicen
 * el paso 1 y el acuse del asistente.
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

/**
 * Comprueba formato y que la fecha exista de verdad: '2026-02-31' pasa el regex
 * pero fromIso lo desplaza al 3 de marzo. Lo usan el panel y la API de escritura.
 */
export const esIsoValido = (iso: string) => ISO_RE.test(iso) && toIso(fromIso(iso)) === iso;

/** Primer dia que se puede reservar: hoy mas los dias de antelacion minima. */
export const primeraFechaReservable = (minDiasAntelacion: number) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + minDiasAntelacion);
  return date;
};

export const estadoFecha = (iso: string, dispo: Disponibilidad): EstadoFecha => {
  if (!ISO_RE.test(iso)) return 'bloqueado';
  if (fromIso(iso) < primeraFechaReservable(dispo.minDiasAntelacion)) return 'bloqueado';
  if (dispo.ocupadas.includes(iso)) return 'ocupado';
  if (dispo.poca.includes(iso)) return 'poca';
  return 'disponible';
};

/** Se puede elegir en el calendario y aceptar en el servidor. */
export const esFechaReservable = (iso: string, dispo: Disponibilidad) => {
  const estado = estadoFecha(iso, dispo);
  return estado === 'disponible' || estado === 'poca';
};

/**
 * Expande un rango inclusivo a fechas sueltas. El panel guarda los rangos como
 * dias individuales: con 12 meses visibles son 365 filas como mucho, y asi la
 * lectura sigue siendo una simple busqueda en una lista.
 *
 * Devuelve [] si el rango esta invertido o alguna fecha no es valida.
 */
export const expandirRango = (desde: string, hasta: string, maxDias = 400) => {
  if (!esIsoValido(desde) || !esIsoValido(hasta)) return [];

  const fin = fromIso(hasta);
  const cursor = fromIso(desde);
  if (cursor > fin) return [];

  const fechas: string[] = [];
  while (cursor <= fin && fechas.length < maxDias) {
    fechas.push(toIso(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return fechas;
};

/**
 * Lista de fechas del formulario. El asistente permite elegir varios dias y los
 * manda en un unico campo `date` separados por comas, porque lead.ts arma el
 * cuerpo con Object.fromEntries(new FormData(...)) y eso colapsa los nombres
 * repetidos: varios <input name="date"> perderian todos menos el ultimo.
 *
 * Una fecha suelta (el <input type="date"> de ContactForm) es simplemente una
 * lista de un elemento, asi que ese formulario sigue funcionando sin cambios.
 *
 * Valida, deduplica y ordena; el orden ISO es alfabetico, asi que sort() basta.
 * El techo real de cuantas caben lo pone MAX_BODY_BYTES en /api/presupuesto.
 */
export const parsearFechas = (valor: string, max = 1000) => [
  ...new Set(
    valor
      .split(',')
      .map((parte) => parte.trim())
      .filter(esIsoValido),
  ),
]
  .sort()
  .slice(0, max);

/** Rotulo del recuento, con el singular resuelto. */
export const contarFechas = (total: number) => (total === 1 ? '1 fecha' : `${total} fechas`);

/** 2026-06-28 -> 28/06/2026 */
export const formatearFecha = (iso: string) => {
  if (!ISO_RE.test(iso)) return iso;
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
};

/** 2026-06-28 -> 28 de junio. Para el resumen de varias fechas, donde el dia de
 * la semana y el ano repetidos no caben en una linea. */
export const formatearDiaMes = (iso: string) => {
  if (!ISO_RE.test(iso)) return iso;
  const date = fromIso(iso);
  return `${date.getDate()} de ${(MESES[date.getMonth()] as string).toLowerCase()}`;
};

/** 2026-06-28 -> Viernes, 28 de junio de 2026 */
export const formatearFechaLarga = (iso: string) => {
  if (!ISO_RE.test(iso)) return iso;
  const date = fromIso(iso);
  const diaSemana = DIAS_LARGOS[date.getDay()] as string;
  const mes = (MESES[date.getMonth()] as string).toLowerCase();
  return `${diaSemana}, ${date.getDate()} de ${mes} de ${date.getFullYear()}`;
};
