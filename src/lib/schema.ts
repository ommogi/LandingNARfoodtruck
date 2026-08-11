/**
 * Constructores de JSON-LD. Fuente unica del grafo de entidades de la web.
 *
 * Todo se emite en un solo bloque `@graph` por pagina (lo monta BaseLayout),
 * con `@id` estables para que los nodos se referencien entre si en lugar de
 * repetir los mismos datos sueltos en cada pagina. Es lo que permite que
 * buscadores y motores generativos entiendan que las nueve paginas son de un
 * mismo negocio.
 *
 * Los datos salen siempre de las fuentes que ya pintan la web
 * (src/config/site.ts, src/data/*). No duplicar constantes aqui: si un dato
 * no esta en pantalla, no deberia estar en el schema.
 */

import { site, contact, social } from '../config/site';
import { configurations } from '../data/configuraciones';
import type { FaqItem } from '../data/faq';
import type { ProcessStep } from '../data/proceso';
import logo from '../assets/logo-nar-horizontal.png';

/* --------------------------------------------------- Identificadores */

/** Nodo del negocio. Todo lo demas cuelga de aqui. */
export const ORGANIZATION_ID = `${site.url}/#organization`;
export const WEBSITE_ID = `${site.url}/#website`;

const ogImage = new URL('/og-nar-foodtruck.jpg', site.url).href;

/** Referencia corta a otro nodo del grafo. */
const ref = (id: string) => ({ '@id': id });

/* --------------------------------------------------- Negocio y sitio */

/**
 * El negocio. `LocalBusiness` es subclase de `Organization`, asi que este
 * unico nodo sirve tambien como `publisher` del sitio.
 *
 * PENDIENTE ANTES DE PUBLICAR: `telephone`, `email`, `sameAs` y la direccion
 * salen de los placeholders de src/config/site.ts. Mientras no se sustituyan
 * por datos verificados, este schema declara datos falsos: es peor que no
 * declararlos. Ver el aviso de la cabecera de src/config/site.ts.
 */
export function organizationNode() {
  return {
    '@type': 'LocalBusiness',
    '@id': ORGANIZATION_ID,
    name: site.name,
    alternateName: site.shortName,
    url: site.url,
    slogan: site.claim,
    description: site.description,
    foundingDate: String(site.foundingYear),
    image: ogImage,
    logo: {
      '@type': 'ImageObject',
      url: new URL(logo.src, site.url).href,
      width: logo.width,
      height: logo.height,
    },
    // TODO: sustituir por el telefono y el email reales antes de publicar.
    telephone: contact.phoneRaw,
    email: contact.email,
    address: {
      '@type': 'PostalAddress',
      // TODO: anadir calle y codigo postal reales (streetAddress, postalCode).
      addressLocality: site.locality,
      addressRegion: site.region,
      addressCountry: site.country,
    },
    areaServed: {
      '@type': 'AdministrativeArea',
      name: site.areaServed,
    },
    // Rango de precio real: 890 - 1690 EUR/dia segun configuracion.
    priceRange: '890€ - 1690€',
    currenciesAccepted: 'EUR',
    knowsAbout: [
      'Alquiler de food trucks',
      'Food trucks para bodas',
      'Food trucks para eventos de empresa',
      'Catering sobre ruedas',
      'Food trucks para ferias y festivales',
    ],
    // TODO: el enlace de Instagram apunta a la home de la red, no al perfil.
    // Un `sameAs` que no identifica la cuenta rompe la senal de entidad.
    sameAs: [social.instagram],
  };
}

export function websiteNode() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: site.url,
    name: site.name,
    description: site.description,
    inLanguage: 'es-ES',
    publisher: ref(ORGANIZATION_ID),
  };
}

interface WebPageInput {
  title: string;
  description: string;
  canonical: string;
}

export function webPageNode({ title, description, canonical }: WebPageInput) {
  return {
    '@type': 'WebPage',
    '@id': `${canonical}#webpage`,
    url: canonical,
    name: title,
    description,
    inLanguage: 'es-ES',
    isPartOf: ref(WEBSITE_ID),
    about: ref(ORGANIZATION_ID),
    primaryImageOfPage: { '@type': 'ImageObject', url: ogImage },
  };
}

/* --------------------------------------------------- Migas */

export interface BreadcrumbItem {
  name: string;
  /** Ruta relativa, por ejemplo "/el-truck". */
  path: string;
}

export function breadcrumbNode(items: BreadcrumbItem[], canonical: string) {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${canonical}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: new URL(item.path, site.url).href,
    })),
  };
}

/* --------------------------------------------------- Servicio y precios */

/**
 * El servicio de alquiler con las cuatro configuraciones como ofertas.
 * Los precios salen de src/data/configuraciones.ts, los mismos que se pintan
 * en las tarjetas de /configuraciones.
 */
export function serviceOffersNode() {
  return {
    '@type': 'Service',
    '@id': `${site.url}/#service`,
    name: 'Alquiler de food truck para eventos',
    serviceType: 'Alquiler de food truck',
    description: site.description,
    provider: ref(ORGANIZATION_ID),
    areaServed: {
      '@type': 'AdministrativeArea',
      name: site.areaServed,
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Configuraciones de equipamiento',
      itemListElement: configurations.map((config) => ({
        '@type': 'Offer',
        name: `Configuración ${config.name}`,
        description: config.cardText,
        price: config.price,
        priceCurrency: 'EUR',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: config.price,
          priceCurrency: 'EUR',
          unitText: 'día',
          referenceQuantity: {
            '@type': 'QuantitativeValue',
            value: 1,
            unitCode: 'DAY',
          },
        },
        availability: 'https://schema.org/InStock',
        // Sin fragmento: los `id` de las tarjetas cuelgan de modales ocultos,
        // asi que un ancla llevaria a contenido que no se ve al llegar.
        url: `${site.url}/configuraciones`,
      })),
    },
  };
}

/* --------------------------------------------------- Respuestas (AEO) */

/**
 * FAQPage. Pasar solo las preguntas que la pagina pinta de verdad: marcar
 * respuestas que el usuario no puede ver incumple las directrices de Google.
 */
export function faqNode(items: FaqItem[], canonical: string) {
  return {
    '@type': 'FAQPage',
    '@id': `${canonical}#faq`,
    mainEntity: items.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}

/** HowTo del proceso de reserva, con los pasos que pinta home/Process.astro. */
export function howToNode(steps: ProcessStep[], canonical: string) {
  return {
    '@type': 'HowTo',
    '@id': `${canonical}#howto`,
    name: 'Cómo alquilar un food truck para tu evento',
    description:
      'Proceso de reserva de un food truck NAR, desde la primera consulta hasta el montaje el día del evento.',
    totalTime: 'P1D',
    step: steps.map((item, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: item.title,
      text: item.text,
    })),
  };
}
