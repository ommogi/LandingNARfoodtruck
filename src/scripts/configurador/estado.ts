/**
 * Estado del configurador: un unico objeto, rutas tipo "proyecto.tipo" para
 * leer y escribir, y suscriptores que repintan tras cada cambio.
 *
 * Se guarda en sessionStorage para que recargar o volver atras no borre lo
 * configurado. Nunca se guardan datos de contacto: esos viven solo en el
 * formulario del paso 10.
 */

import {
  estadoInicial,
  opcionPorId,
  type Catalogo,
  type EstadoConfigurador,
  type PasoId,
} from '../../data/configurador';

/* La vista previa del editor guarda aparte: el admin no mezcla sus pruebas con
   lo que haya configurado como visitante en el mismo navegador. */
const CLAVE = document.querySelector('[data-cf-editor]') ? 'foodd-configurador-editor' : 'foodd-configurador-v1';

type Guardado = { estado: EstadoConfigurador; paso: PasoId };

const leerGuardado = (): Partial<Guardado> | null => {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE) ?? 'null') as Partial<Guardado> | null;
  } catch {
    return null;
  }
};

/**
 * Mezcla lo guardado sobre el estado inicial seccion a seccion: si una version
 * nueva anade un campo, una sesion antigua no lo deja en undefined.
 */
const restaurar = (guardado: Partial<EstadoConfigurador> | undefined): EstadoConfigurador => {
  const base = estadoInicial();
  if (!guardado || typeof guardado !== 'object') return base;
  for (const clave of Object.keys(base) as (keyof EstadoConfigurador)[]) {
    const seccion = guardado[clave];
    if (seccion && typeof seccion === 'object') Object.assign(base[clave], seccion);
  }
  return base;
};

const inicial = leerGuardado();

export const store = {
  estado: restaurar(inicial?.estado),
  pasoGuardado: (inicial?.paso ?? null) as PasoId | null,
};

type Oyente = () => void;
const oyentes: Oyente[] = [];

export const alCambiar = (fn: Oyente) => {
  oyentes.push(fn);
};

let pendiente = false;

/** Agrupa varios cambios seguidos en un solo repintado. */
export const notificar = () => {
  if (pendiente) return;
  pendiente = true;
  queueMicrotask(() => {
    pendiente = false;
    oyentes.forEach((fn) => fn());
  });
};

export const guardar = (paso: PasoId) => {
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify({ estado: store.estado, paso }));
  } catch {
    /* Modo privado o almacenamiento lleno: se sigue sin persistir. */
  }
};

export const borrarGuardado = () => {
  try {
    sessionStorage.removeItem(CLAVE);
  } catch {
    /* nada que hacer */
  }
};

/* --------------------------------------------------- Rutas */

export const leer = (ruta: string): unknown =>
  ruta.split('.').reduce<unknown>((obj, parte) => (obj as Record<string, unknown> | null)?.[parte], store.estado);

/**
 * Escribe un valor y aplica las dependencias: cambiar el padre descarta la
 * hija si ya no le pertenece. Todo lo demas se conserva (el briefing pide no
 * borrar selecciones compatibles).
 */
export const escribir = (ruta: string, valor: unknown, catalogo: Catalogo) => {
  const partes = ruta.split('.');
  const ultima = partes.pop() as string;
  const destino = partes.reduce<Record<string, unknown>>(
    (obj, parte) => obj[parte] as Record<string, unknown>,
    store.estado as unknown as Record<string, unknown>,
  );
  destino[ultima] = valor;

  const e = store.estado;
  if (ruta === 'proyecto.tipo') {
    if (opcionPorId(catalogo, e.proyecto.subtipo)?.padre !== e.proyecto.tipo) e.proyecto.subtipo = null;
    // Un uso restringido a otro tipo de proyecto (Promo) deja de valer.
    const uso = opcionPorId(catalogo, e.configuracion.uso);
    if (uso?.visible_para.length && !uso.visible_para.includes(String(valor))) {
      e.configuracion.uso = null;
      e.configuracion.sub = null;
    }
  }
  if (ruta === 'configuracion.uso') {
    if (opcionPorId(catalogo, e.configuracion.sub)?.padre !== e.configuracion.uso) e.configuracion.sub = null;
  }
  if (ruta === 'fecha.situacion' || ruta === 'fecha.modo') {
    if (ruta === 'fecha.modo' && valor === 'single') e.fecha.fin = null;
  }
  if (ruta === 'cocina.personasNoSe' && valor) e.cocina.personas = null;
  if (ruta === 'logistica.asistentesNoSe' && valor) e.logistica.asistentes = null;
  if (ruta === 'logistica.sinHorario' && valor) {
    e.logistica.inicio = '';
    e.logistica.fin = '';
  }

  notificar();
};

/** Anade o quita un valor de una lista. */
export const alternar = (ruta: string, valor: string, catalogo: Catalogo) => {
  const lista = (leer(ruta) as string[] | undefined) ?? [];
  escribir(ruta, lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor], catalogo);
};
