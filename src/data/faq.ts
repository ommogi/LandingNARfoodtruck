/**
 * Contenido de /faq. Fuente unica: la pagina, el buscador y el schema
 * FAQPage se generan desde aqui.
 *
 * Las respuestas solo repiten datos ya publicados en el resto de la web
 * (cotas y ficha tecnica de /el-truck, condiciones de alquiler de /galeria
 * y /configuraciones). No inventar precios, plazos ni coberturas nuevas.
 *
 * `featured: true` marca las preguntas que se muestran tambien en el bloque
 * corto de /el-truck, para no duplicar redacciones distintas.
 */

import type { IconName } from '../components/icons';
import { site } from '../config/site';

export type FaqCategory = 'alquiler' | 'truck' | 'logistica' | 'evento' | 'legal';

export interface FaqItem {
  question: string;
  answer: string;
  category: FaqCategory;
  featured?: boolean;
}

export interface FaqFilter {
  value: FaqCategory | 'all';
  label: string;
  icon: IconName;
}

export const faqFilters: FaqFilter[] = [
  { value: 'all', label: 'Todas', icon: 'grid' },
  { value: 'alquiler', label: 'Alquiler', icon: 'euro' },
  { value: 'truck', label: 'El truck', icon: 'truck' },
  { value: 'logistica', label: 'Montaje', icon: 'wrench' },
  { value: 'evento', label: 'Tu evento', icon: 'confetti' },
  { value: 'legal', label: 'Normativa', icon: 'shield' },
];

export const categoryLabels: Record<FaqCategory, string> = {
  alquiler: 'Alquiler',
  truck: 'El truck',
  logistica: 'Montaje',
  evento: 'Tu evento',
  legal: 'Normativa',
};

export const faqItems: FaqItem[] = [
  /* ------------------------------------------------------------ Alquiler */
  {
    question: '¿Qué incluye exactamente el alquiler?',
    answer:
      'Alquilas el food truck equipado: transporte hasta la ubicación, montaje, nivelación, puesta en marcha, recogida al terminar y soporte durante todo el alquiler. No incluye elaboración de alimentos, personal de cocina ni catering.',
    category: 'alquiler',
    featured: true,
  },
  {
    question: '¿Por cuánto tiempo puedo alquilarlo?',
    answer:
      'Por días, por fines de semana o por el periodo que necesites. El formato más habitual es de una jornada completa, pero adaptamos la duración a ferias, rodajes o activaciones de varias semanas.',
    category: 'alquiler',
  },
  {
    question: '¿Cuánto cuesta?',
    answer:
      'El precio depende de la configuración de equipamiento, de la duración y de la distancia hasta la ubicación. En la página de configuraciones tienes el precio de partida de cada opción; el presupuesto final te lo enviamos cerrado y sin compromiso.',
    category: 'alquiler',
  },
  {
    question: '¿Con cuánta antelación debo reservar?',
    answer:
      'Cuanto antes mejor: los fines de semana de temporada alta y las fechas de bodas se cierran con meses de antelación. Si tu fecha está cerca, escríbenos igualmente y te confirmamos disponibilidad real.',
    category: 'alquiler',
  },
  {
    question: '¿Cómo se confirma la reserva?',
    answer:
      'Con la firma del contrato de alquiler y el pago de la señal acordada. Hasta ese momento la fecha queda como consulta, sin bloqueo ni compromiso por tu parte.',
    category: 'alquiler',
  },
  {
    question: '¿Cuánto tardáis en responder a una solicitud?',
    answer:
      'Menos de 24 horas. Te contestamos con la disponibilidad de la fecha y una propuesta ajustada a lo que nos cuentes del evento.',
    category: 'alquiler',
  },

  /* --------------------------------------------------------------- Truck */
  {
    question: '¿Qué medidas tiene el truck?',
    answer:
      'Mide 5,40 m de largo por 2,40 m de alto y pesa 2.000 kg. Para el montaje y la zona de servicio recomendamos reservar un espacio libre y llano de unos 7 x 4 m.',
    category: 'truck',
    featured: true,
  },
  {
    question: '¿Qué equipamiento lleva dentro?',
    answer:
      'Según la configuración elegida: plancha, fogones, freidora, neveras, congelador, campana extractora, fregadero doble, iluminación LED y almacenamiento. Cada configuración incluye el equipamiento de la anterior y suma el suyo propio.',
    category: 'truck',
  },
  {
    question: '¿Puedo usar mi propio equipamiento o menaje?',
    answer:
      'Sí. El truck es tu espacio de trabajo durante el alquiler: puedes traer tu menaje, tus utensilios y tu producto. Solo pedimos que el equipo instalado se use conforme a las instrucciones que te entregamos.',
    category: 'truck',
  },
  {
    question: '¿Cuántas personas se pueden atender desde el truck?',
    answer:
      'Hasta 150 personas por hora, según el formato de servicio y la carta que decidas ofrecer. Cuéntanos el número de invitados y te orientamos sobre el ritmo real de servicio.',
    category: 'truck',
  },
  {
    question: '¿Se puede personalizar la imagen exterior?',
    answer:
      'Para acciones de marca podemos valorar rotulación temporal y elementos de imagen que no dañen el acabado. Consúltanos con antelación para reservar el tiempo de preparación.',
    category: 'truck',
  },

  /* ---------------------------------------------------------- Logistica */
  {
    question: '¿Necesito conexión eléctrica o de agua?',
    answer:
      'No. El truck es autónomo en agua, electricidad y gas. Si la ubicación dispone de toma eléctrica podemos usarla para reducir el ruido del generador.',
    category: 'logistica',
    featured: true,
  },
  {
    question: '¿Cuánto tarda el montaje?',
    answer:
      'Menos de 60 minutos desde la llegada. Nos coordinamos contigo para estar listos antes de que empiece el evento.',
    category: 'logistica',
    featured: true,
  },
  {
    question: '¿En qué zonas os desplazáis?',
    answer:
      `Trabajamos en ${site.areaServed}. Para eventos fuera de la provincia escríbenos y valoramos el desplazamiento sin compromiso.`,
    category: 'logistica',
    featured: true,
  },
  {
    question: '¿Qué tipo de acceso necesita la ubicación?',
    answer:
      'Un acceso rodado para el vehículo de remolque y una superficie llana y firme donde estacionar. En espacios con bordillos, arena o pendientes fuertes lo revisamos antes para evitar sorpresas el día del evento.',
    category: 'logistica',
  },
  {
    question: '¿Puede montarse en interior o en un aparcamiento cubierto?',
    answer:
      'Sí, siempre que la altura libre supere los 2,40 m del truck y el recinto permita el acceso y la ventilación necesarios. Necesitamos comprobarlo con el espacio antes de confirmar.',
    category: 'logistica',
  },
  {
    question: '¿Qué pasa si llueve?',
    answer:
      'El truck funciona igual: el servicio se hace desde la ventana y el equipo queda protegido. Lo que conviene prever es una zona cubierta para tus invitados en la cola de servicio.',
    category: 'logistica',
  },

  /* ------------------------------------------------------------- Evento */
  {
    question: '¿Para qué tipo de eventos se alquila?',
    answer:
      'Bodas, eventos de empresa, cumpleaños, festivales, ferias y eventos privados. También rodajes y activaciones de marca que necesitan un espacio de servicio móvil.',
    category: 'evento',
  },
  {
    question: '¿Ponéis vosotros la comida o el personal?',
    answer:
      'No. Nuestro servicio es el alquiler del vehículo equipado. La comida, la carta y el personal de cocina los pones tú o el cátering con el que trabajes.',
    category: 'evento',
  },
  {
    question: '¿Podéis recomendarme un cátering o un cocinero?',
    answer:
      'Podemos orientarte sobre formatos que funcionan bien en el truck y sobre qué necesita un equipo de cocina para trabajar cómodo dentro. La contratación siempre es directa entre tú y el proveedor.',
    category: 'evento',
  },
  {
    question: '¿Se puede usar el truck de noche?',
    answer:
      'Sí. Lleva iluminación LED interior y perimetral, así que funciona igual en eventos nocturnos. Ten en cuenta los horarios de ruido que fije el recinto o el ayuntamiento.',
    category: 'evento',
  },

  /* -------------------------------------------------------------- Legal */
  {
    question: '¿El truck cumple la normativa sanitaria?',
    answer:
      'Sí. El vehículo está homologado y cumple la normativa de higiene y seguridad aplicable a unidades móviles. Te facilitamos la documentación del remolque para la que necesites presentar ante el recinto.',
    category: 'legal',
  },
  {
    question: '¿Quién pide los permisos del evento?',
    answer:
      'Los permisos de ocupación de vía pública o de actividad los tramita quien organiza el evento ante el ayuntamiento o el recinto. Nosotros aportamos la documentación técnica del truck que te soliciten.',
    category: 'legal',
  },
  {
    question: '¿El alquiler incluye seguro?',
    answer:
      'El vehículo cuenta con su seguro obligatorio. La responsabilidad civil de la actividad que se desarrolle durante el evento corresponde a quien lo organiza; te indicamos qué coberturas conviene tener contratadas.',
    category: 'legal',
  },
  {
    question: '¿Qué pasa si tengo que cancelar o cambiar la fecha?',
    answer:
      'Las condiciones de cancelación y de cambio de fecha figuran en el contrato de alquiler. Si nos avisas con antelación intentamos siempre reubicar la reserva en otra fecha disponible.',
    category: 'legal',
  },
];
