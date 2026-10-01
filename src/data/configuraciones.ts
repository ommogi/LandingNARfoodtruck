/**
 * Datos de /configuraciones: las cuatro configuraciones de equipamiento, la
 * ficha tecnica del remolque y los bloques que comparten pagina y modales.
 *
 * El equipamiento es acumulativo: cada configuracion incluye la anterior, por
 * eso `cardFeatures` empieza por "Todo lo de la opcion ..." y `equipment` se
 * compone a partir del array de la configuracion previa.
 *
 * Las especificaciones tecnicas salen de la homologacion europea del remolque
 * (ficha EC Type 4m Airstream Food Trailer del fabricante). No inventar.
 */

import type { ImageMetadata } from 'astro';
import type { IconName } from '../components/icons';
import { configNames, type ConfigId } from './config-ids';

import heroInterior from '../assets/gallery/hero-interior.webp';
import interior01 from '../assets/gallery/interior-01.webp';
import interior02 from '../assets/gallery/interior-02.webp';
import interior03 from '../assets/gallery/interior-03.webp';
import detalleLamparas from '../assets/gallery/detalle-lamparas.webp';
import detalleEquipamiento from '../assets/gallery/detalle-equipamiento.webp';
import truckExterior from '../assets/gallery/truck-exterior-01.webp';
import truckDimensions from '../assets/truck-dimensions.webp';

/* Los ids y sus nombres viven en ./config-ids, que tambien usan el asistente de
 * reserva y la API sin arrastrar las imagenes de este archivo. */
export type { ConfigId };

/** Color de acento de cada configuracion, mapeado a una clase en el CSS. */
export type ConfigAccent = 'blue' | 'rust' | 'night';

export interface EquipmentItem {
  /** Se pinta cuando no hay foto de producto todavia. */
  icon: IconName;
  /** Foto del equipo. Pendiente: se anadira sin tocar los componentes. */
  image?: ImageMetadata;
  name: string;
  text?: string;
  /** Muestra el sello "CE Certified" bajo el nombre. */
  certified?: boolean;
  /** Medidas y capacidad, por ejemplo "1500x600x800 mm / 232 L". */
  spec?: string;
}

export interface ConfigStat {
  icon: IconName;
  value: string;
  label: string;
}

export interface Configuration {
  id: ConfigId;
  name: string;
  icon: IconName;
  accent: ConfigAccent;
  /** Numero de estrellas llenas sobre cinco. */
  stars: number;
  /** Etiqueta que cuelga del borde superior de la tarjeta. */
  badge?: string;
  /** Tarjeta destacada: boton relleno en lugar de perfilado. */
  featured?: boolean;
  /** Precio "desde", en euros por dia. */
  price: number;
  cardText: string;
  cardFeatures: string[];
  modalLead: string;
  stats: ConfigStat[];
  equipment: EquipmentItem[];
  photo: ImageMetadata;
  thumbs: ImageMetadata[];
}

/** Render lateral con las cotas rotuladas, compartido por el hero y los modales. */
export const truckRender = truckDimensions;

/* --------------------------------------------------- Equipamiento acumulativo */

const baseEquipment: EquipmentItem[] = [
  {
    icon: 'kitchen',
    name: 'Campana extractora',
    text: 'Campana con ventiladores extractores certificados CE y cubierta de acero inoxidable.',
  },
  {
    icon: 'ruler',
    name: 'Encimeras de acero inoxidable',
    text: 'Superficies de trabajo continuas, sin juntas y de limpieza rápida.',
  },
  {
    icon: 'bolt',
    name: 'Luces LED interiores',
    text: 'Iluminación de trabajo de baja temperatura en toda la zona de cocina.',
  },
  {
    icon: 'drop',
    name: 'Nevera bajo encimera',
    certified: true,
    spec: '1500x600x800 mm / 232 L',
  },
  {
    icon: 'drop',
    name: 'Congelador bajo encimera',
    certified: true,
    spec: '1200x600x800 mm / 165 L',
  },
];

const compactEquipment: EquipmentItem[] = [
  ...baseEquipment,
  {
    icon: 'dish',
    name: 'Gofrera doble',
    text: 'Dos placas independientes con control de temperatura.',
  },
  {
    icon: 'dish',
    name: 'Crepera',
    text: 'Placa circular profesional para crepes dulces y salados.',
  },
  {
    icon: 'cup',
    name: 'Cafetera profesional',
    text: 'Grupo profesional para servicio continuo de café.',
  },
];

const profesionalEquipment: EquipmentItem[] = [
  ...compactEquipment,
  {
    icon: 'kitchen',
    name: 'Plancha doble a gas',
    text: 'Quemador en forma de "H" con dispositivo de seguridad.',
  },
  {
    icon: 'kitchen',
    name: 'Freidora doble a gas',
    text: 'Válvula SIT y controlador de temperatura.',
  },
  {
    icon: 'chef',
    name: 'Cocina de gas de 2 fuegos',
    text: 'De sobremesa, con dispositivo de seguridad por termopar.',
  },
];

const maxEquipment: EquipmentItem[] = [
  ...profesionalEquipment,
  {
    icon: 'grid',
    name: 'Espacio optimizado para mayor producción',
    text: 'Distribución ampliada de almacenaje y zona de emplatado para picos de servicio.',
  },
];

/* --------------------------------------------------- Configuraciones */

/** Comunes a las cuatro: el remolque es siempre el mismo, cambia el interior. */
const commonStats: ConfigStat[] = [
  { icon: 'arrow-h', value: '2,20 m', label: 'Ancho' },
  { icon: 'ruler', value: '4,00 m', label: 'Longitud interior' },
];

export const configurations: Configuration[] = [
  {
    id: 'base',
    name: configNames.base,
    icon: 'shield',
    accent: 'blue',
    stars: 2,
    price: 890,
    cardText: 'Equipamiento esencial para comenzar tu negocio.',
    cardFeatures: [
      'Campana extractora',
      'Encimeras de acero inoxidable',
      'Luces LED interiores',
      'Nevera bajo encimera',
      'Congelador bajo encimera',
    ],
    modalLead:
      'El punto de partida: todo lo imprescindible para trabajar con seguridad e higiene desde el primer día, sin equipamiento de más.',
    stats: [...commonStats, { icon: 'users', value: '1 – 2', label: 'Operarios' }],
    equipment: baseEquipment,
    photo: interior01,
    thumbs: [interior03, detalleEquipamiento, heroInterior, truckExterior],
  },
  {
    id: 'compact',
    name: configNames.compact,
    icon: 'cup',
    accent: 'rust',
    stars: 3,
    badge: 'Más vendida',
    price: 1090,
    cardText: 'Ideal para bebidas, postres y opciones rápidas.',
    cardFeatures: [
      'Todo lo de la opción Base',
      'Gofrera doble',
      'Crepera',
      'Cafetera profesional',
    ],
    modalLead:
      'Pensada para cafés, crepes, gofres y postres. Servicio ágil, poca manipulación y una barra que funciona sola con dos personas.',
    stats: [...commonStats, { icon: 'users', value: '2', label: 'Operarios' }],
    equipment: compactEquipment,
    photo: detalleLamparas,
    thumbs: [interior01, interior02, heroInterior, truckExterior],
  },
  {
    id: 'profesional',
    name: configNames.profesional,
    icon: 'chef',
    accent: 'rust',
    stars: 4,
    badge: 'Nuestra recomendación',
    featured: true,
    price: 1390,
    cardText: 'Máximo rendimiento para cocina caliente y producción rápida.',
    cardFeatures: [
      'Todo lo de la opción Compact',
      'Plancha doble de gas',
      'Freidora doble de gas',
      'Cocina de gas de 2 fuegos',
    ],
    modalLead:
      'El equilibrio perfecto entre espacio, funcionalidad y rendimiento. Ideal para negocios que buscan eficiencia, versatilidad y una operación profesional.',
    stats: [...commonStats, { icon: 'users', value: '2 – 3', label: 'Operarios' }],
    equipment: profesionalEquipment,
    photo: interior02,
    thumbs: [heroInterior, interior03, interior01, truckExterior],
  },
  {
    id: 'max',
    name: configNames.max,
    icon: 'crown',
    accent: 'night',
    stars: 5,
    price: 1690,
    cardText: 'La configuración más completa para cualquier tipo de evento.',
    cardFeatures: [
      'Todo lo de la opción Profesional',
      '+ Espacio optimizado para mayor producción',
    ],
    modalLead:
      'Todo el equipamiento disponible y la distribución más eficiente del truck. Para eventos largos, cartas amplias y picos de servicio exigentes.',
    stats: [...commonStats, { icon: 'users', value: '3', label: 'Operarios' }],
    equipment: maxEquipment,
    photo: heroInterior,
    thumbs: [interior02, interior01, detalleLamparas, truckExterior],
  },
];

/* --------------------------------------------------- Bloques compartidos */

/**
 * Ficha tecnica del remolque, identica en las cuatro configuraciones.
 * Fuente: homologacion europea (masas, ejes, ruedas y velocidad maxima).
 */
export const technicalSpecs: { label: string; value: string }[] = [
  { label: 'Dimensiones interiores', value: '4,00 x 2,20 x 2,10 m' },
  { label: 'Operarios recomendados', value: '2 – 3 personas' },
  { label: 'Ejes', value: '2 ejes, 4 ruedas' },
  { label: 'Masa máxima técnicamente admisible', value: '2.500 kg' },
  { label: 'Masa en orden de marcha', value: '1.600 kg' },
  { label: 'Carga útil máxima', value: '900 kg' },
  { label: 'Velocidad máxima', value: '80 km/h' },
  { label: 'Sistema eléctrico', value: 'Monofásico 230 V / Trifásico 400 V' },
  { label: 'Homologación', value: 'Cumple normativa europea para venta ambulante' },
  { label: 'Frenos', value: 'Mecánicos' },
  { label: 'Ruedas', value: '185R14 LT' },
  { label: 'Conexiones del remolque', value: 'Mecánicas' },
];

export const idealPara: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'store',
    title: 'Negocios de comida',
    text: 'Food trucks de hamburguesas, tapas, crepes, helados, café y más.',
  },
  {
    icon: 'calendar',
    title: 'Eventos de tamaño medio',
    text: 'Bodas, cumpleaños, ferias, festivales, eventos corporativos y más.',
  },
  {
    icon: 'chart',
    title: 'Emprendedores y marcas',
    text: 'La opción más versátil para empezar o hacer crecer tu negocio.',
  },
];

/** Iconos de la banda oscura "Interior profesional". */
export const interiorFeatures: { icon: IconName; title: string }[] = [
  { icon: 'shield', title: '100% Profesional' },
  { icon: 'check', title: 'Homologado y seguro' },
  { icon: 'cog', title: 'Listo para trabajar' },
  { icon: 'truck', title: 'Compacto por fuera. Profesional por dentro.' },
  { icon: 'pin', title: 'Llega donde está tu evento' },
];

/** Franja de garantias del final de la pagina. */
export const perks: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'tools',
    title: '100% personalizable',
    text: 'Elige el equipamiento que mejor se adapta a tu menú.',
  },
  {
    icon: 'medal',
    title: 'Calidad profesional',
    text: 'Equipamiento de primeras marcas, diseñado para uso intensivo.',
  },
  {
    icon: 'clipboard',
    title: 'Listo para trabajar',
    text: 'Instalación completa y revisada antes de cada evento.',
  },
  {
    icon: 'truck',
    title: 'Transporte incluido',
    text: 'Nos encargamos del transporte, instalación y retirada.',
  },
];

/**
 * Formatea el precio como en el diseno: 1.090 (separador de millar espanol).
 * A mano y no con toLocaleString porque el Node del build no incluye el ICU
 * completo y devolveria "1090" sin separador.
 */
export const formatPrice = (price: number) => String(price).replace(/\B(?=(\d{3})+$)/g, '.');
