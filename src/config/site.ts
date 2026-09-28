/**
 * Fuente unica de datos editables de la web (Anexo A de la guia).
 * Cambiar aqui dominio, contacto, redes y navegacion: header, footer,
 * schema y paginas legales leen de este archivo.
 *
 * PENDIENTE ANTES DE PUBLICAR: telefono, email, redes y dominio son
 * los valores de ejemplo de la guia. Sustituir por datos verificados.
 *
 * Zona de servicio: toda Espana (confirmado por NAR). La sede sigue en
 * Valencia (`locality`), que es lo que usa la direccion del schema.
 */

export const site = {
  name: 'NAR Food Truck Events',
  shortName: 'NAR',
  url: 'https://www.narfoodtruck.com',
  claim: 'Experiencias sobre ruedas desde 1981',
  description:
    'Alquiler de food trucks premium para bodas, empresas, ferias y eventos privados. Nos desplazamos por toda España.',
  locality: 'Valencia',
  region: 'Comunitat Valenciana',
  country: 'ES',
  areaServed: 'Toda España',
  /** Zona ampliada tal y como se nombra en textos de cobertura. */
  areaServedLong: 'toda España',
  foundingYear: 1981,
} as const;

export const contact = {
  email: 'hola@narfoodtruck.com',
  phone: '+34 600 123 456',
  /** Formato E.164, para enlaces tel: y schema. */
  phoneRaw: '+34600123456',
  /** Solo digitos, para el enlace de WhatsApp. */
  whatsapp: '34600123456',
  address: 'Valencia, España',
} as const;

export const social = {
  instagram: 'https://www.instagram.com/',
  whatsapp: `https://wa.me/${contact.whatsapp}`,
} as const;

export interface NavItem {
  label: string;
  href: string;
  /** true mientras la pagina de destino no exista todavia. */
  pending?: boolean;
}

/**
 * Navegacion principal aprobada. Las anclas llevan la ruta delante para que
 * funcionen desde cualquier pagina.
 */
export const mainNav: NavItem[] = [
  { label: 'Inicio', href: '/#inicio' },
  { label: 'El Truck', href: '/el-truck' },
  { label: 'Nosotros', href: '/nosotros' },
  { label: 'Eventos', href: '/#eventos' },
  { label: 'Configuraciones', href: '/configuraciones' },
  { label: 'Servicios', href: '/servicios' },
  { label: 'Galería', href: '/galeria' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contacto', href: '/contacto' },
];

/**
 * Columnas de navegacion del footer. Cada grupo es una columna de la rejilla y
 * su `label` es el aria-label de esa columna: el diseno no lleva titulos
 * visibles, asi que sin el los cuatro <nav> serian indistinguibles al navegar
 * por landmarks.
 */
export const footerNavColumns: { label: string; items: NavItem[] }[] = [
  {
    label: 'Navegación del pie',
    items: [
      { label: 'Inicio', href: '/#inicio' },
      { label: 'El Truck', href: '/el-truck' },
      { label: 'Nosotros', href: '/nosotros' },
    ],
  },
  {
    label: 'Eventos y configuraciones',
    items: [
      { label: 'Eventos', href: '/#eventos' },
      { label: 'Configuraciones', href: '/configuraciones' },
      { label: 'Servicios', href: '/servicios' },
    ],
  },
  {
    label: 'Galería, ayuda y contacto',
    items: [
      { label: 'Galería', href: '/galeria' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Contacto', href: '/contacto' },
    ],
  },
];

export const legalNav: NavItem[] = [
  { label: 'Aviso Legal', href: '/aviso-legal' },
  { label: 'Política de Privacidad', href: '/privacidad' },
  { label: 'Cookies', href: '/cookies' },
];

/** Tipos de evento del formulario y de la seccion "Ideal para cualquier evento". */
export const eventTypes = [
  'Boda',
  'Empresa',
  'Cumpleaños',
  'Festival',
  'Feria',
  'Evento privado',
] as const;
