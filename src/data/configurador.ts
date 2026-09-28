/**
 * Configurador de /configurador: tipos, pasos, catalogo de respaldo y logica
 * pura que comparten el navegador y el servidor.
 *
 * Este modulo es PURO y viaja al bundle del navegador. Nunca puede contener
 * precios: los precios viven solo en la tabla `configurador_precios` de
 * Supabase y los lee el servidor (src/lib/configurador-server.ts) al enviar.
 *
 * El catalogo real se edita desde /admin/configurador. CATALOGO_RESPALDO es la
 * red de seguridad si Supabase no responde, y es tambien la semilla de la
 * migracion 0003 (mantener los dos en sintonia al anadir opciones).
 */

import { expandirRango, formatearFecha } from './disponibilidad';
import type { ItemLista, NombreLista } from './configurador-textos';

/* --------------------------------------------------- Pasos */

export const PASOS = [
  { id: 'proyecto', etiqueta: 'Tu proyecto', icono: 'confetti' },
  { id: 'fecha', etiqueta: 'Fecha y disponibilidad', icono: 'calendar' },
  { id: 'configuracion', etiqueta: 'Configuración', icono: 'cog' },
  { id: 'equipamiento', etiqueta: 'Equipamiento', icono: 'kitchen' },
  { id: 'cocina', etiqueta: 'Servicio de cocina', icono: 'chef' },
  { id: 'ambientacion', etiqueta: 'Ambientación', icono: 'sofa' },
  { id: 'branding', etiqueta: 'Branding', icono: 'paintbrush' },
  { id: 'logistica', etiqueta: 'Ubicación y logística', icono: 'pin' },
  { id: 'resumen', etiqueta: 'Resumen', icono: 'doc' },
  { id: 'solicitud', etiqueta: 'Solicitud', icono: 'send' },
] as const;

export type PasoId = (typeof PASOS)[number]['id'];
export const TOTAL_PASOS = PASOS.length;

/** Titulo y subtitulo de cada paso. Editables desde el admin. */
export type TextosPaso = { titulo: string; subtitulo: string };

export const TEXTOS_PASO_RESPALDO: Record<PasoId, TextosPaso> = {
  proyecto: {
    titulo: '¿Para qué lo necesitas?',
    subtitulo: 'Elige la opción que más se adapte a tu proyecto.',
  },
  fecha: {
    titulo: '¿Cuándo necesitas FOODD?',
    subtitulo: 'Selecciona la fecha de tu proyecto y comprueba la disponibilidad antes de continuar.',
  },
  configuracion: {
    titulo: '¿Cómo quieres utilizar FOODD?',
    subtitulo: 'Elige la configuración que mejor se adapta a tu proyecto.',
  },
  equipamiento: {
    titulo: 'Equipa tu FOODD',
    subtitulo:
      'Tu FOODD incluye el equipamiento base necesario. Te recomendamos la maquinaria ideal para tu proyecto: añade o quita lo que necesites.',
  },
  cocina: {
    titulo: '¿Necesitas cocinero para tu proyecto?',
    subtitulo:
      'Trabaja con tu propio equipo o añade un cocinero profesional para desarrollar el servicio acordado.',
  },
  ambientacion: {
    titulo: 'Crea el espacio alrededor de FOODD',
    subtitulo:
      'Puedes alquilar únicamente FOODD o completar el proyecto con mobiliario y ambientación exterior.',
  },
  branding: {
    titulo: '¿Quieres personalizar FOODD con tu marca?',
    subtitulo: 'Personaliza FOODD con tu identidad visual o mantén su estética original.',
  },
  logistica: {
    titulo: '¿Dónde necesitas FOODD?',
    subtitulo: 'Indícanos dónde tendrá lugar tu proyecto y nos encargaremos de preparar la logística necesaria.',
  },
  resumen: {
    titulo: 'Revisa tu FOODD',
    subtitulo: 'Comprueba tu configuración antes de solicitar el presupuesto. Puedes modificar cualquier apartado.',
  },
  solicitud: {
    titulo: 'Recibe tu propuesta',
    subtitulo: 'Déjanos tus datos y revisaremos tu configuración para preparar un presupuesto personalizado.',
  },
};

/* --------------------------------------------------- Catalogo */

/**
 * Tipos de opcion. Cada uno pertenece a un paso:
 *   proyecto, subtipo           -> paso 1
 *   uso, subconfig              -> paso 3
 *   equipo                      -> paso 4
 *   cocina, cocina_servicio     -> paso 5
 *   ambientacion                -> paso 6
 *   branding                    -> paso 7
 *   espacio, acceso, logistica  -> paso 8
 */
export const TIPOS_OPCION = [
  'proyecto',
  'subtipo',
  'uso',
  'subconfig',
  'equipo',
  'cocina',
  'cocina_servicio',
  'ambientacion',
  'branding',
  'espacio',
  'acceso',
  'logistica',
] as const;

export type TipoOpcion = (typeof TIPOS_OPCION)[number];

export const TIPO_ETIQUETA: Record<TipoOpcion, string> = {
  proyecto: 'Paso 1 · Tipo de proyecto',
  subtipo: 'Paso 1 · Subtipo',
  uso: 'Paso 3 · Uso (familia)',
  subconfig: 'Paso 3 · Subconfiguración',
  equipo: 'Paso 4 · Equipamiento',
  cocina: 'Paso 5 · Modalidad de cocina',
  cocina_servicio: 'Paso 5 · Tipo de servicio',
  ambientacion: 'Paso 6 · Ambientación',
  branding: 'Paso 7 · Branding',
  espacio: 'Paso 8 · Tipo de espacio',
  acceso: 'Paso 8 · Acceso',
  logistica: 'Paso 8 · Modalidad logística',
};

/** Tipo de opcion cuyo padre es obligatorio. */
export const TIPO_PADRE: Partial<Record<TipoOpcion, TipoOpcion>> = {
  subtipo: 'proyecto',
  subconfig: 'uso',
};

export const CATEGORIAS_EQUIPO = [
  { id: 'coccion', nombre: 'Cocción' },
  { id: 'cafe_bebidas', nombre: 'Café & Bebidas' },
  { id: 'dulces', nombre: 'Dulces' },
  { id: 'conservacion', nombre: 'Conservación' },
  { id: 'preparacion', nombre: 'Preparación' },
  { id: 'consumibles', nombre: 'Consumibles' },
  { id: 'otros', nombre: 'Otros' },
] as const;

export type Unidad = 'dia' | 'proyecto' | 'persona';

export const UNIDADES: Record<Unidad, string> = {
  dia: 'por día',
  proyecto: 'fijo por proyecto',
  persona: 'por persona',
};

export interface Opcion {
  /** Slug estable. Es lo que viaja en el formulario y en el email. */
  id: string;
  tipo: TipoOpcion;
  /** Subtipo -> proyecto, subconfig -> uso. */
  padre: string | null;
  nombre: string;
  descripcion: string;
  /** Ruta publica (/configurador/x.webp) o URL del bucket de Supabase. */
  imagen: string | null;
  /** Nombre de icono del registro de src/components/icons.ts. */
  icono: string | null;
  /** Chips "Usos" de la tarjeta o elementos del ambiente. */
  etiquetas: string[];
  /** Solo equipamiento: pestana del catalogo. */
  categoria: string | null;
  /** Solo equipamiento: viene de serie y no se puede quitar. */
  incluido: boolean;
  /** Solo equipamiento: ids de subconfig para las que se recomienda. */
  recomendado_para: string[];
  /**
   * Restringe donde aparece la opcion. Vacio = siempre.
   *   uso             -> ids de proyecto (PROMO solo en Marca & Activacion)
   *   cocina_servicio -> ids de uso
   */
  visible_para: string[];
  /** Solo uso: el paso de servicio de cocina aparece para esta familia. */
  mostrar_cocina: boolean;
  /** Abre un campo de texto libre al elegirla ("A medida", "Otro"). */
  a_medida: boolean;
  /** Aviso corto bajo la tarjeta, p. ej. "Sujeto a valoración". */
  aviso: string | null;
  orden: number;
  activo: boolean;
}

export interface AjustesConfigurador {
  /** Precio publico "Desde X € + IVA / día". El interno esta en `rental_base`. */
  precioDesde: number;
  textoIncluye: string;
  /** Numero de WhatsApp del asesor, solo digitos con prefijo (34600...). */
  whatsapp: string;
  pasos: Record<PasoId, TextosPaso>;
  /** Textos e imagenes fijas editados (ver configurador-textos.ts). */
  textos: Record<string, string>;
  /** Listas pequenas editadas (ver configurador-textos.ts). */
  listas: Partial<Record<NombreLista, ItemLista[]>>;
}

export interface Catalogo {
  opciones: Opcion[];
  ajustes: AjustesConfigurador;
  /**
   * Solo en la vista previa del editor del panel: marca lo editable
   * (data-cf-edit), muestra las opciones ocultas y deja navegar libremente.
   * Nunca se activa en /configurador.
   */
  editor?: boolean;
}

/** Id reservado del precio interno del alquiler base. No es una opcion visible. */
export const RENTAL_BASE_ID = 'rental_base';

/**
 * Ids con significado propio en la logica. El admin no puede borrarlos (si
 * puede desactivarlos o renombrarlos).
 */
export const IDS_PROTEGIDOS = [
  'evento',
  'gastronomia',
  'marca',
  'otro',
  'marca.roadshow',
  'cocina.propio',
  'cocina.cocinero',
] as const;

export const ROADSHOW_ID = 'marca.roadshow';

/** Opcion completa con valores por defecto: la semilla solo declara lo que cambia. */
const op = (o: Partial<Opcion> & Pick<Opcion, 'id' | 'tipo' | 'nombre'>): Opcion => ({
  padre: null,
  descripcion: '',
  imagen: null,
  icono: null,
  etiquetas: [],
  categoria: null,
  incluido: false,
  recomendado_para: [],
  visible_para: [],
  mostrar_cocina: false,
  a_medida: false,
  aviso: null,
  orden: 0,
  activo: true,
  ...o,
});

const img = (nombre: string) => `/configurador/${nombre}.webp`;

export const OPCIONES_RESPALDO: Opcion[] = [
  /* ---------- Paso 1 */
  op({ id: 'evento', tipo: 'proyecto', nombre: 'Evento', orden: 1, icono: 'calendar', imagen: img('proyecto-evento'),
    descripcion: 'Bodas, celebraciones, eventos corporativos, ferias y festivales.' }),
  op({ id: 'gastronomia', tipo: 'proyecto', nombre: 'Gastronomía', orden: 2, icono: 'chef', imagen: img('proyecto-gastronomia'),
    descripcion: 'Un espacio profesional para cocina, café, bar o propuestas gastronómicas.' }),
  op({ id: 'marca', tipo: 'proyecto', nombre: 'Marca & Activación', orden: 3, icono: 'megaphone', imagen: img('proyecto-marca'),
    descripcion: 'Promociones, sampling, lanzamientos, hospitality y campañas itinerantes.' }),
  op({ id: 'otro', tipo: 'proyecto', nombre: 'Otro proyecto', orden: 4, icono: 'lightbulb', imagen: img('proyecto-otro'), a_medida: true,
    descripcion: 'Cuéntanos tu idea. Si tu proyecto no encaja en las categorías anteriores, lo analizamos juntos.' }),

  op({ id: 'evento.boda', tipo: 'subtipo', padre: 'evento', nombre: 'Boda / Celebración', orden: 1, icono: 'rings',
    descripcion: 'Bodas, aniversarios y celebraciones.' }),
  op({ id: 'evento.corporativo', tipo: 'subtipo', padre: 'evento', nombre: 'Corporativo', orden: 2, icono: 'briefcase',
    descripcion: 'Eventos de empresa, congresos y encuentros profesionales.' }),
  op({ id: 'evento.feria', tipo: 'subtipo', padre: 'evento', nombre: 'Feria / Festival', orden: 3, icono: 'tent',
    descripcion: 'Ferias, festivales, mercados y eventos abiertos al público.' }),
  op({ id: 'evento.otro', tipo: 'subtipo', padre: 'evento', nombre: 'Otro evento', orden: 4, icono: 'ellipsis', a_medida: true,
    descripcion: 'Un formato diferente.' }),

  op({ id: 'gastronomia.cocina', tipo: 'subtipo', padre: 'gastronomia', nombre: 'Cocina profesional', orden: 1, icono: 'utensils' }),
  op({ id: 'gastronomia.cafe_dulces', tipo: 'subtipo', padre: 'gastronomia', nombre: 'Café y dulces', orden: 2, icono: 'cup' }),
  op({ id: 'gastronomia.bar', tipo: 'subtipo', padre: 'gastronomia', nombre: 'Bar y bebidas', orden: 3, icono: 'wine' }),
  op({ id: 'gastronomia.propuestas', tipo: 'subtipo', padre: 'gastronomia', nombre: 'Propuestas gastronómicas', orden: 4, icono: 'dish' }),

  op({ id: 'marca.activacion', tipo: 'subtipo', padre: 'marca', nombre: 'Activación de marca', orden: 1, icono: 'target' }),
  op({ id: 'marca.sampling', tipo: 'subtipo', padre: 'marca', nombre: 'Sampling', orden: 2, icono: 'gift' }),
  op({ id: 'marca.lanzamiento', tipo: 'subtipo', padre: 'marca', nombre: 'Lanzamiento', orden: 3, icono: 'sparkles' }),
  op({ id: 'marca.hospitality', tipo: 'subtipo', padre: 'marca', nombre: 'Hospitality', orden: 4, icono: 'users' }),
  op({ id: 'marca.roadshow', tipo: 'subtipo', padre: 'marca', nombre: 'Roadshow', orden: 5, icono: 'route', imagen: img('subtipo-roadshow'),
    descripcion: 'Campaña itinerante por varias ciudades.' }),
  op({ id: 'marca.otro', tipo: 'subtipo', padre: 'marca', nombre: 'Otro', orden: 6, icono: 'ellipsis', a_medida: true }),

  /* ---------- Paso 3 */
  op({ id: 'food', tipo: 'uso', nombre: 'Food', orden: 1, icono: 'utensils', imagen: img('uso-food'), mostrar_cocina: true,
    descripcion: 'Cocina y preparación gastronómica.', etiquetas: ['Street Food', 'Catering', 'Cocina'] }),
  op({ id: 'coffee', tipo: 'uso', nombre: 'Coffee', orden: 2, icono: 'cup', imagen: img('uso-coffee'),
    descripcion: 'Café y bebidas calientes.', etiquetas: ['Coffee Point', 'Coffee Catering', 'Corporate'] }),
  op({ id: 'bar', tipo: 'uso', nombre: 'Bar', orden: 3, icono: 'wine', imagen: img('uso-bar'),
    descripcion: 'Bebidas, cocktails y servicio de barra.', etiquetas: ['Cocktails', 'Beer', 'Drinks'] }),
  op({ id: 'sweet', tipo: 'uso', nombre: 'Sweet', orden: 4, icono: 'cake', imagen: img('uso-sweet'), mostrar_cocina: true,
    descripcion: 'Crepes, gofres y propuestas dulces.', etiquetas: ['Crepes', 'Gofres', 'Sweet'] }),
  op({ id: 'promo', tipo: 'uso', nombre: 'Promo / Display', orden: 5, icono: 'megaphone', imagen: img('uso-promo'), visible_para: ['marca'],
    descripcion: 'Punto de atención, promoción, sampling o presentación de producto.', etiquetas: ['Sampling', 'Brand Activation'] }),

  op({ id: 'food.street_food', tipo: 'subconfig', padre: 'food', nombre: 'Street Food', orden: 1, icono: 'hamburger',
    descripcion: 'Para hamburguesas, bocadillos, plancha y propuestas de servicio rápido.' }),
  op({ id: 'food.cocina_completa', tipo: 'subconfig', padre: 'food', nombre: 'Cooking', orden: 2, icono: 'utensils',
    descripcion: 'Para elaboraciones que necesitan una zona de cocina más completa.' }),
  op({ id: 'food.horno', tipo: 'subconfig', padre: 'food', nombre: 'Bakery / Hot', orden: 3, icono: 'microwave',
    descripcion: 'Para horneado, calentamiento y preparaciones calientes.' }),
  op({ id: 'food.a_medida', tipo: 'subconfig', padre: 'food', nombre: 'Food a medida', orden: 4, icono: 'sliders', a_medida: true,
    descripcion: 'En el siguiente paso podrás elegir equipamiento.' }),

  op({ id: 'coffee.point', tipo: 'subconfig', padre: 'coffee', nombre: 'Coffee Point', orden: 1, icono: 'cup',
    descripcion: 'Café de calidad con un servicio ágil.' }),
  op({ id: 'coffee.sweet', tipo: 'subconfig', padre: 'coffee', nombre: 'Coffee & Sweet', orden: 2, icono: 'croissant',
    descripcion: 'Café acompañado de crepes, gofres o bollería.' }),
  op({ id: 'coffee.a_medida', tipo: 'subconfig', padre: 'coffee', nombre: 'Coffee a medida', orden: 3, icono: 'sliders', a_medida: true,
    descripcion: 'En el siguiente paso podrás elegir equipamiento.' }),

  op({ id: 'bar.drinks', tipo: 'subconfig', padre: 'bar', nombre: 'Drinks & Cocktails', orden: 1, icono: 'martini',
    descripcion: 'Barra de bebidas y coctelería.' }),
  op({ id: 'bar.beer', tipo: 'subconfig', padre: 'bar', nombre: 'Beer', orden: 2, icono: 'beer', aviso: 'Configuración a revisar',
    descripcion: 'Servicio de cerveza.' }),
  op({ id: 'bar.a_medida', tipo: 'subconfig', padre: 'bar', nombre: 'Bar a medida', orden: 3, icono: 'sliders', a_medida: true,
    descripcion: 'En el siguiente paso podrás elegir equipamiento.' }),

  op({ id: 'sweet.crepes', tipo: 'subconfig', padre: 'sweet', nombre: 'Crepes', orden: 1, icono: 'dish',
    descripcion: 'Crepes dulces y salados.' }),
  op({ id: 'sweet.gofres', tipo: 'subconfig', padre: 'sweet', nombre: 'Gofres', orden: 2, icono: 'grid',
    descripcion: 'Gofres y elaboraciones dulces.' }),
  op({ id: 'sweet.coffee_sweet', tipo: 'subconfig', padre: 'sweet', nombre: 'Coffee & Sweet', orden: 3, icono: 'croissant',
    descripcion: 'Dulce acompañado de café.' }),
  op({ id: 'sweet.full', tipo: 'subconfig', padre: 'sweet', nombre: 'Full Sweet', orden: 4, icono: 'cake',
    descripcion: 'Crepes, gofres y café en una misma barra.' }),
  op({ id: 'sweet.a_medida', tipo: 'subconfig', padre: 'sweet', nombre: 'Sweet a medida', orden: 5, icono: 'sliders', a_medida: true,
    descripcion: 'En el siguiente paso podrás elegir equipamiento.' }),

  op({ id: 'promo.display', tipo: 'subconfig', padre: 'promo', nombre: 'Promo / Display', orden: 1, icono: 'megaphone',
    descripcion: 'Punto de atención y presentación de producto.' }),
  op({ id: 'promo.a_medida', tipo: 'subconfig', padre: 'promo', nombre: 'Promo a medida', orden: 2, icono: 'sliders', a_medida: true,
    descripcion: 'En el siguiente paso podrás elegir equipamiento.' }),

  /* ---------- Paso 4 */
  op({ id: 'equipo.nevera', tipo: 'equipo', nombre: 'Nevera', orden: 1, icono: 'refrigerator', categoria: 'conservacion', incluido: true,
    descripcion: 'Bajo encimera. Gran capacidad de refrigeración.' }),
  op({ id: 'equipo.congelador', tipo: 'equipo', nombre: 'Congelador', orden: 2, icono: 'snowflake', categoria: 'conservacion', incluido: true,
    descripcion: 'Bajo encimera. Conservación de productos congelados.' }),
  op({ id: 'equipo.botellero', tipo: 'equipo', nombre: 'Botellero / Enfriador', orden: 3, icono: 'wine', categoria: 'conservacion', incluido: true,
    descripcion: 'Ideal para bebidas, vinos y mixers.' }),
  op({ id: 'equipo.zona_trabajo', tipo: 'equipo', nombre: 'Zona de trabajo + iluminación', orden: 4, icono: 'lamp-ceiling', categoria: 'preparacion', incluido: true,
    descripcion: 'Encimera de acero inoxidable e iluminación LED.' }),

  op({ id: 'equipo.plancha', tipo: 'equipo', nombre: 'Plancha', orden: 10, icono: 'flame', categoria: 'coccion',
    recomendado_para: ['food.street_food', 'food.cocina_completa', 'food.horno'],
    descripcion: 'Para hamburguesas, bocadillos y elaboraciones a la plancha.' }),
  op({ id: 'equipo.freidora', tipo: 'equipo', nombre: 'Freidora', orden: 11, icono: 'kitchen', categoria: 'coccion',
    recomendado_para: ['food.street_food', 'food.cocina_completa'],
    descripcion: 'Para frituras y propuestas de servicio rápido.' }),
  op({ id: 'equipo.fuegos', tipo: 'equipo', nombre: 'Cocina / Fuegos', orden: 12, icono: 'flame', categoria: 'coccion',
    recomendado_para: ['food.street_food', 'food.cocina_completa', 'food.horno'],
    descripcion: 'Para cocciones, salsas y recetas más elaboradas.' }),
  op({ id: 'equipo.horno', tipo: 'equipo', nombre: 'Horno', orden: 13, icono: 'microwave', categoria: 'coccion',
    recomendado_para: ['food.street_food', 'food.cocina_completa', 'food.horno'],
    descripcion: 'Para horneado, regeneración y mantenimiento de temperatura.' }),
  op({ id: 'equipo.cafetera', tipo: 'equipo', nombre: 'Cafetera profesional', orden: 20, icono: 'cup', categoria: 'cafe_bebidas',
    recomendado_para: ['coffee.point', 'coffee.sweet', 'sweet.crepes', 'sweet.gofres', 'sweet.coffee_sweet', 'sweet.full'],
    descripcion: 'Para café de especialidad.' }),
  op({ id: 'equipo.crepera', tipo: 'equipo', nombre: 'Crepera', orden: 30, icono: 'dish', categoria: 'dulces',
    recomendado_para: ['coffee.sweet', 'sweet.crepes', 'sweet.gofres', 'sweet.coffee_sweet', 'sweet.full'],
    descripcion: 'Para crepes y propuestas dulces.' }),
  op({ id: 'equipo.gofrera', tipo: 'equipo', nombre: 'Gofrera', orden: 31, icono: 'grid', categoria: 'dulces',
    recomendado_para: ['coffee.sweet', 'sweet.crepes', 'sweet.gofres', 'sweet.coffee_sweet', 'sweet.full'],
    descripcion: 'Para gofres y elaboraciones dulces.' }),
  op({ id: 'equipo.bano_maria', tipo: 'equipo', nombre: 'Baño maría', orden: 40, icono: 'soup', categoria: 'conservacion',
    descripcion: 'Para mantener la temperatura.' }),
  op({ id: 'equipo.tostador', tipo: 'equipo', nombre: 'Tostador', orden: 50, icono: 'sandwich', categoria: 'preparacion',
    descripcion: 'Para pan y bollería.' }),
  op({ id: 'equipo.kit_vasos', tipo: 'equipo', nombre: 'Kit de vasos y tazas', orden: 60, icono: 'cup', categoria: 'consumibles',
    descripcion: 'Vasos, tazas y tapas desechables o compostables.' }),
  op({ id: 'equipo.kit_menaje', tipo: 'equipo', nombre: 'Kit de menaje', orden: 61, icono: 'utensils', categoria: 'consumibles',
    descripcion: 'Platos, cubiertos y servilletas para el servicio.' }),
  op({ id: 'equipo.kit_limpieza', tipo: 'equipo', nombre: 'Kit de limpieza', orden: 62, icono: 'drop', categoria: 'consumibles',
    descripcion: 'Productos de limpieza e higiene para la jornada.' }),

  /* ---------- Paso 5 */
  op({ id: 'cocina.propio', tipo: 'cocina', nombre: 'Solo FOODD', orden: 1, icono: 'users', imagen: img('viaja'),
    descripcion: 'Trabajaré con mi propio personal. Tú aportas el personal necesario para desarrollar la actividad.',
    etiquetas: ['FOODD', 'Equipamiento seleccionado', 'Tu propio personal'] }),
  op({ id: 'cocina.cocinero', tipo: 'cocina', nombre: 'FOODD + Cocinero', orden: 2, icono: 'chef', imagen: img('cocinero'),
    aviso: 'Sujeto a disponibilidad',
    descripcion: 'Quiero añadir un cocinero profesional para preparar y desarrollar el servicio gastronómico acordado.',
    etiquetas: ['Cocinero profesional', 'FOODD', 'Equipamiento seleccionado'] }),

  op({ id: 'servicio.street_food', tipo: 'cocina_servicio', nombre: 'Street food', orden: 1, icono: 'hamburger' }),
  op({ id: 'servicio.hamburguesas', tipo: 'cocina_servicio', nombre: 'Hamburguesas', orden: 2, icono: 'hamburger' }),
  op({ id: 'servicio.bocadillos', tipo: 'cocina_servicio', nombre: 'Bocadillos', orden: 3, icono: 'sandwich' }),
  op({ id: 'servicio.plancha', tipo: 'cocina_servicio', nombre: 'Plancha', orden: 4, icono: 'flame' }),
  op({ id: 'servicio.crepes', tipo: 'cocina_servicio', nombre: 'Crepes', orden: 5, icono: 'dish' }),
  op({ id: 'servicio.gofres', tipo: 'cocina_servicio', nombre: 'Gofres', orden: 6, icono: 'grid' }),
  op({ id: 'servicio.dulce', tipo: 'cocina_servicio', nombre: 'Dulce', orden: 7, icono: 'cake' }),
  op({ id: 'servicio.otro', tipo: 'cocina_servicio', nombre: 'Otro', orden: 8, icono: 'ellipsis' }),

  /* ---------- Paso 6 */
  op({ id: 'amb.essential', tipo: 'ambientacion', nombre: 'Essential', orden: 1, imagen: img('amb-essential'),
    descripcion: 'Funcional, limpio y versátil.', etiquetas: ['Mesas altas', 'Taburetes', 'Mesas auxiliares', 'Iluminación básica'] }),
  op({ id: 'amb.mediterraneo', tipo: 'ambientacion', nombre: 'Mediterráneo', orden: 2, imagen: img('amb-mediterraneo'),
    descripcion: 'Natural, cálido y relajado.', etiquetas: ['Mesas de madera', 'Sillas de fibras', 'Vegetación', 'Iluminación cálida'] }),
  op({ id: 'amb.lounge', tipo: 'ambientacion', nombre: 'Lounge', orden: 3, imagen: img('amb-lounge'),
    descripcion: 'Relajado, sofisticado y experiencial.', etiquetas: ['Sofás y butacas', 'Mesas bajas', 'Vegetación', 'Iluminación ambiental'] }),
  op({ id: 'amb.a_medida', tipo: 'ambientacion', nombre: 'Ambientación a medida', orden: 4, icono: 'sliders', a_medida: true,
    descripcion: 'Si ninguno de nuestros ambientes encaja, cuéntanos cómo imaginas el espacio y prepararemos una propuesta personalizada.' }),

  /* ---------- Paso 7 */
  op({ id: 'brand.ligero', tipo: 'branding', nombre: 'Vinilado ligero', orden: 1, imagen: img('brand-ligero'),
    descripcion: 'Pequeños elementos de marca (logotipo, vinilos discretos).', etiquetas: ['Logotipo + detalles'] }),
  op({ id: 'brand.parcial', tipo: 'branding', nombre: 'Vinilado parcial', orden: 2, imagen: img('brand-parcial'),
    descripcion: 'Personalización en zonas seleccionadas del remolque.', etiquetas: ['Gráfica parcial + logotipo'] }),
  op({ id: 'brand.total', tipo: 'branding', nombre: 'Vinilado total', orden: 3, imagen: img('brand-total'), aviso: 'Sujeto a valoración',
    descripcion: 'Personalización completa del remolque con tu marca.', etiquetas: ['Vinilado integral'] }),
  op({ id: 'brand.a_medida', tipo: 'branding', nombre: 'A medida', orden: 4, imagen: img('brand-medida'), a_medida: true,
    descripcion: 'Diseño totalmente personalizado según tus necesidades.', etiquetas: ['Diseño exclusivo'] }),

  /* ---------- Paso 8 */
  op({ id: 'espacio.exterior', tipo: 'espacio', nombre: 'Exterior', orden: 1, icono: 'sun', descripcion: 'Espacio completamente al aire libre.' }),
  op({ id: 'espacio.interior', tipo: 'espacio', nombre: 'Interior', orden: 2, icono: 'house', descripcion: 'FOODD se instalará dentro de un recinto.' }),
  op({ id: 'espacio.cubierto', tipo: 'espacio', nombre: 'Cubierto / Semicubierto', orden: 3, icono: 'umbrella', descripcion: 'Espacio exterior con cubierta o protección.' }),
  op({ id: 'espacio.no_se', tipo: 'espacio', nombre: 'Todavía no lo sé', orden: 4, icono: 'help', descripcion: 'Aún no lo tengo definido.' }),

  op({ id: 'acceso.si', tipo: 'acceso', nombre: 'Sí, sin problemas', orden: 1 }),
  op({ id: 'acceso.limitado', tipo: 'acceso', nombre: 'Sí, con alguna limitación', orden: 2 }),
  op({ id: 'acceso.no_se', tipo: 'acceso', nombre: 'No lo sé', orden: 3 }),
  op({ id: 'acceso.no', tipo: 'acceso', nombre: 'No, acceso complicado', orden: 4 }),

  op({ id: 'logistica.entrega', tipo: 'logistica', nombre: 'Entrega y recogida', orden: 1, icono: 'truck',
    descripcion: 'Llevamos FOODD a la ubicación acordada y lo recogemos al finalizar.' }),
  op({ id: 'logistica.instalacion', tipo: 'logistica', nombre: 'Instalación completa', orden: 2, icono: 'tools',
    descripcion: 'Entrega, posicionamiento y preparación de todo lo contratado, además de la recogida.' }),
];

export const AJUSTES_RESPALDO: AjustesConfigurador = {
  precioDesde: 450,
  textoIncluye:
    'Incluye: remolque, nevera, congelador, zona de trabajo, iluminación e instalaciones disponibles del remolque.',
  whatsapp: '',
  pasos: TEXTOS_PASO_RESPALDO,
  textos: {},
  listas: {},
};

export const CATALOGO_RESPALDO: Catalogo = {
  opciones: OPCIONES_RESPALDO,
  ajustes: AJUSTES_RESPALDO,
};

/* --------------------------------------------------- Constantes no editables */

/*
 * Las microdecisiones sin precio (situacion de la fecha, alimentos,
 * necesidades, capacidades, categorias, archivos de marca) viven en
 * configurador-textos.ts como listas editables desde el panel: lista().
 */

export const PROVINCIAS = [
  'A Coruña', 'Álava', 'Albacete', 'Alicante', 'Almería', 'Asturias', 'Ávila', 'Badajoz', 'Baleares',
  'Barcelona', 'Burgos', 'Cáceres', 'Cádiz', 'Cantabria', 'Castellón', 'Ceuta', 'Ciudad Real', 'Córdoba',
  'Cuenca', 'Girona', 'Granada', 'Guadalajara', 'Guipúzcoa', 'Huelva', 'Huesca', 'Jaén', 'La Rioja',
  'Las Palmas', 'León', 'Lleida', 'Lugo', 'Madrid', 'Málaga', 'Melilla', 'Murcia', 'Navarra', 'Ourense',
  'Palencia', 'Pontevedra', 'Salamanca', 'Santa Cruz de Tenerife', 'Segovia', 'Sevilla', 'Soria',
  'Tarragona', 'Teruel', 'Toledo', 'Valencia', 'Valladolid', 'Vizcaya', 'Zamora', 'Zaragoza',
] as const;

/* --------------------------------------------------- Estado */

export interface Parada {
  ciudad: string;
  fecha: string | null;
  direccion: string;
  cp: string;
  inicio: string;
  fin: string;
  asistentes: number | null;
  espacio: string | null;
  acceso: string | null;
  notas: string;
}

export const paradaVacia = (): Parada => ({
  ciudad: '',
  fecha: null,
  direccion: '',
  cp: '',
  inicio: '',
  fin: '',
  asistentes: null,
  espacio: null,
  acceso: null,
  notas: '',
});

export interface EstadoConfigurador {
  proyecto: { tipo: string | null; subtipo: string | null; descripcion: string };
  fecha: {
    situacion: 'known' | 'multiple' | 'unknown' | null;
    /** single: un dia · range: periodo continuo · dias: dias sueltos (3, 5, 7…). */
    modo: 'single' | 'range' | 'dias';
    inicio: string | null;
    /** Solo en modo 'dias': los dias sueltos elegidos, en ISO y ordenados. */
    dias: string[];
    fin: string | null;
    alternativas: string[];
    elegida: string | null;
    paradas: Parada[];
  };
  configuracion: { uso: string | null; sub: string | null; descripcion: string };
  equipamiento: { seleccion: string[]; otros: string };
  cocina: {
    opcion: string | null;
    servicios: string[];
    descripcion: string;
    personas: number | null;
    personasNoSe: boolean;
    alimentos: string | null;
    necesidades: string[];
    notas: string;
  };
  ambientacion: {
    quiere: boolean | null;
    opcion: string | null;
    descripcion: string;
    categorias: string[];
    personas: string | null;
  };
  branding: {
    quiere: boolean | null;
    tipo: string | null;
    archivos: string | null;
    marca: string;
    descripcion: string;
  };
  logistica: {
    localidad: string;
    provincia: string;
    cp: string;
    direccion: string;
    sinDireccion: boolean;
    inicio: string;
    fin: string;
    sinHorario: boolean;
    asistentes: number | null;
    asistentesNoSe: boolean;
    espacio: string | null;
    acceso: string | null;
    modo: string | null;
    notas: string;
  };
}

export const estadoInicial = (): EstadoConfigurador => ({
  proyecto: { tipo: null, subtipo: null, descripcion: '' },
  fecha: {
    situacion: null,
    modo: 'single',
    inicio: null,
    dias: [],
    fin: null,
    alternativas: [],
    elegida: null,
    paradas: [paradaVacia(), paradaVacia()],
  },
  configuracion: { uso: null, sub: null, descripcion: '' },
  equipamiento: { seleccion: [], otros: '' },
  cocina: {
    opcion: null,
    servicios: [],
    descripcion: '',
    personas: null,
    personasNoSe: false,
    alimentos: null,
    necesidades: [],
    notas: '',
  },
  ambientacion: { quiere: null, opcion: null, descripcion: '', categorias: [], personas: null },
  branding: { quiere: null, tipo: null, archivos: null, marca: '', descripcion: '' },
  logistica: {
    localidad: '',
    provincia: '',
    cp: '',
    direccion: '',
    sinDireccion: false,
    inicio: '',
    fin: '',
    sinHorario: false,
    asistentes: null,
    asistentesNoSe: false,
    espacio: null,
    acceso: null,
    modo: null,
    notas: '',
  },
});

/* --------------------------------------------------- Consultas al catalogo */

export const opcionPorId = (catalogo: Catalogo, id: string | null | undefined) =>
  id ? catalogo.opciones.find((o) => o.id === id) ?? null : null;

export const nombreDe = (catalogo: Catalogo, id: string | null | undefined, fallback = '') =>
  opcionPorId(catalogo, id)?.nombre ?? fallback;

/** Opciones activas de un tipo, ordenadas. Con `padre`, solo sus hijas. */
/** Opciones de un tipo, ordenadas. En el editor incluye tambien las ocultas. */
export const opcionesDe = (catalogo: Catalogo, tipo: TipoOpcion, padre?: string | null) =>
  catalogo.opciones
    .filter(
      (o) => (o.activo || catalogo.editor) && o.tipo === tipo && (padre === undefined || o.padre === padre),
    )
    .sort((a, b) => a.orden - b.orden);

/** `visible_para` vacio = visible siempre. */
export const esVisiblePara = (opcion: Opcion, contexto: string | null) =>
  opcion.visible_para.length === 0 || (contexto !== null && opcion.visible_para.includes(contexto));

export const esRoadshow = (estado: EstadoConfigurador) => estado.proyecto.subtipo === ROADSHOW_ID;

/** El paso 5 solo aparece si la familia de uso elegida lo pide. */
export const muestraCocina = (estado: EstadoConfigurador, catalogo: Catalogo) => {
  const uso = opcionPorId(catalogo, estado.configuracion.uso);
  return uso ? uso.mostrar_cocina : true;
};

export const pasosVisibles = (estado: EstadoConfigurador, catalogo: Catalogo): PasoId[] =>
  PASOS.map((p) => p.id).filter((id) => id !== 'cocina' || muestraCocina(estado, catalogo));

/* --------------------------------------------------- Fechas y dias */

/** Fechas de servicio que cuentan para disponibilidad y para facturar. */
export const fechasServicio = (estado: EstadoConfigurador): string[] => {
  const f = estado.fecha;
  if (esRoadshow(estado)) {
    return [...new Set(f.paradas.map((p) => p.fecha).filter((x): x is string => Boolean(x)))].sort();
  }
  if (f.situacion === 'known') {
    if (f.modo === 'dias') return [...new Set(f.dias)].sort();
    if (!f.inicio) return [];
    if (f.modo === 'range' && f.fin) return expandirRango(f.inicio, f.fin, 60);
    return [f.inicio];
  }
  if (f.situacion === 'multiple') return f.elegida ? [f.elegida] : [];
  return [];
};

/** Dias por los que se multiplica lo que va "por dia". null = sin definir. */
export const diasFacturables = (estado: EstadoConfigurador): number | null => {
  const n = fechasServicio(estado).length;
  return n > 0 ? n : null;
};

/** Texto corto de la fecha para la barra lateral, el resumen y el email. */
export const textoFecha = (estado: EstadoConfigurador): string => {
  const f = estado.fecha;
  if (esRoadshow(estado)) {
    const validas = f.paradas.filter((p) => p.ciudad || p.fecha);
    return validas.length ? `${validas.length} paradas` : '';
  }
  if (f.situacion === 'unknown') return 'Fecha por definir';
  if (f.situacion === 'multiple') {
    if (!f.alternativas.length) return '';
    return f.elegida
      ? `${formatearFecha(f.elegida)} (de ${f.alternativas.length} opciones)`
      : `${f.alternativas.length} fechas posibles`;
  }
  if (f.situacion === 'known' && f.modo === 'dias') {
    const dias = [...f.dias].sort();
    if (!dias.length) return '';
    return dias.length === 1
      ? formatearFecha(dias[0] as string)
      : `${dias.length} días: ${dias.map((d) => formatearFecha(d).slice(0, 5)).join(', ')}`;
  }
  if (f.situacion === 'known' && f.inicio) {
    if (f.modo === 'range' && f.fin && f.fin !== f.inicio) {
      const dias = expandirRango(f.inicio, f.fin, 60).length;
      return `${formatearFecha(f.inicio)} – ${formatearFecha(f.fin)} (${dias} días)`;
    }
    return formatearFecha(f.inicio);
  }
  return '';
};

/* --------------------------------------------------- Completitud */

const lleno = (s: string | null | undefined) => Boolean(s && s.trim());

/**
 * Motivo por el que no se puede continuar, o '' si el paso esta completo.
 * Lo usan el boton Continuar, los circulos de la barra lateral y el servidor.
 */
export const faltaEnPaso = (paso: PasoId, estado: EstadoConfigurador, catalogo: Catalogo): string => {
  switch (paso) {
    case 'proyecto': {
      const { tipo, subtipo, descripcion } = estado.proyecto;
      if (!tipo) return 'Elige el tipo de proyecto';
      const tipoOp = opcionPorId(catalogo, tipo);
      const subtipos = opcionesDe(catalogo, 'subtipo', tipo);
      if (subtipos.length && !subtipo) return 'Elige el tipo de ' + (tipoOp?.nombre.toLowerCase() ?? 'proyecto');
      const conTexto = tipoOp?.a_medida || opcionPorId(catalogo, subtipo)?.a_medida;
      if (conTexto && !lleno(descripcion)) return 'Cuéntanos brevemente tu proyecto';
      return '';
    }
    case 'fecha': {
      const f = estado.fecha;
      if (esRoadshow(estado)) {
        const completas = f.paradas.filter((p) => lleno(p.ciudad) && p.fecha);
        if (completas.length < 2) return 'Indica al menos dos paradas con ciudad y fecha';
        if (completas.length !== f.paradas.length) return 'Completa o elimina las paradas vacías';
        return '';
      }
      if (!f.situacion) return 'Selecciona tu situación';
      if (f.situacion === 'known' && f.modo === 'dias') {
        if (!f.dias.length) return 'Marca en el calendario los días de tu proyecto';
      } else if (f.situacion === 'known') {
        if (!f.inicio) return 'Selecciona la fecha en el calendario';
        if (f.modo === 'range' && !f.fin) return 'Selecciona el último día del periodo';
      }
      if (f.situacion === 'multiple') {
        if (f.alternativas.length < 2) return 'Marca al menos dos fechas posibles';
        if (!f.elegida) return 'Elige con qué fecha quieres continuar';
      }
      return '';
    }
    case 'configuracion': {
      const { uso, sub, descripcion } = estado.configuracion;
      if (!uso) return 'Elige cómo quieres utilizar FOODD';
      if (opcionesDe(catalogo, 'subconfig', uso).length && !sub) return 'Elige el tipo de configuración';
      if (opcionPorId(catalogo, sub)?.a_medida && !lleno(descripcion)) return 'Cuéntanos qué configuración necesitas';
      return '';
    }
    case 'equipamiento':
      return '';
    case 'cocina': {
      const c = estado.cocina;
      if (!c.opcion) return 'Elige si quieres añadir un cocinero';
      if (c.opcion !== 'cocina.cocinero') return '';
      if (!c.servicios.length) return 'Selecciona el tipo de servicio';
      if (!lleno(c.descripcion)) return 'Cuéntanos qué quieres preparar';
      if (!c.personasNoSe && !(c.personas && c.personas > 0)) return 'Indica para cuántas personas';
      if (!c.alimentos) return 'Indica quién aportará los alimentos';
      return '';
    }
    case 'ambientacion': {
      const a = estado.ambientacion;
      if (a.quiere === null) return 'Elige si quieres ambientación';
      if (!a.quiere) return '';
      if (!a.opcion) return 'Elige un ambiente';
      if (opcionPorId(catalogo, a.opcion)?.a_medida && !lleno(a.descripcion)) return 'Cuéntanos cómo imaginas el espacio';
      if (!a.personas) return 'Indica la capacidad aproximada del espacio';
      return '';
    }
    case 'branding': {
      const b = estado.branding;
      if (b.quiere === null) return 'Elige si quieres personalizar FOODD';
      if (!b.quiere) return '';
      if (!b.tipo) return 'Elige el tipo de personalización';
      if (!b.archivos) return 'Indica el estado de tus archivos';
      if (opcionPorId(catalogo, b.tipo)?.a_medida && !lleno(b.descripcion)) return 'Cuéntanos qué personalización necesitas';
      return '';
    }
    case 'logistica': {
      const l = estado.logistica;
      if (esRoadshow(estado)) {
        if (!l.modo) return 'Elige la modalidad logística';
        return '';
      }
      if (!lleno(l.localidad)) return 'Indica la localidad';
      if (!lleno(l.provincia)) return 'Indica la provincia';
      if (!l.sinHorario && (!l.inicio || !l.fin)) return 'Indica el horario o marca que aún no lo tienes';
      if (!l.asistentesNoSe && !(l.asistentes && l.asistentes > 0)) return 'Indica los asistentes o marca que no lo sabes';
      if (!l.espacio) return 'Indica dónde se instalará FOODD';
      if (!l.acceso) return 'Indica si hay acceso para el remolque';
      if (!l.modo) return 'Elige la modalidad logística';
      return '';
    }
    default:
      return '';
  }
};

export const pasoCompleto = (paso: PasoId, estado: EstadoConfigurador, catalogo: Catalogo) =>
  faltaEnPaso(paso, estado, catalogo) === '';

/* --------------------------------------------------- Seleccion para presupuestar */

/**
 * Ids de todas las opciones elegidas, en el orden en que se presentan. Es lo que
 * el servidor cruza con `configurador_precios`.
 */
export const opcionesElegidas = (estado: EstadoConfigurador, catalogo: Catalogo): string[] => {
  const ids: (string | null)[] = [
    estado.proyecto.tipo,
    estado.proyecto.subtipo,
    estado.configuracion.uso,
    estado.configuracion.sub,
    ...estado.equipamiento.seleccion,
  ];

  if (muestraCocina(estado, catalogo) && estado.cocina.opcion) {
    ids.push(estado.cocina.opcion);
    if (estado.cocina.opcion === 'cocina.cocinero') ids.push(...estado.cocina.servicios);
  }
  if (estado.ambientacion.quiere) ids.push(estado.ambientacion.opcion);
  if (estado.branding.quiere) ids.push(estado.branding.tipo);
  if (!esRoadshow(estado)) ids.push(estado.logistica.espacio, estado.logistica.acceso);
  ids.push(estado.logistica.modo);

  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
};

/** Formato espanol 1.234,50 a mano (el Node del build no trae ICU completo). */
export const formatearEuros = (valor: number) => {
  const [entero, dec] = valor.toFixed(2).split('.');
  const conMiles = (entero as string).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${conMiles},${dec} €`;
};
