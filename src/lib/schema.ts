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
import { AJUSTES_RESPALDO } from '../data/configurador';
import { textoPlanoFaq, type FaqItem } from '../data/faq';
import type { ProcessStep } from '../data/proceso';
import logo from '../assets/logo-nar-horizontal.webp';

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
      '@type': 'Country',
      name: 'España',
    },
    // Precio de partida del FOODD Rental Base (+ IVA / dia); el resto va a presupuesto.
    priceRange: `Desde ${AJUSTES_RESPALDO.precioDesde}€`,
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
  /** true si la pagina emite breadcrumbNode (todas menos la home). */
  hasBreadcrumb?: boolean;
}

export function webPageNode({ title, description, canonical, hasBreadcrumb = false }: WebPageInput) {
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
    ...(hasBreadcrumb && { breadcrumb: ref(`${canonical}#breadcrumb`) }),
  };
}

/**
 * Migas Inicio > pagina. La web es plana (todas las paginas cuelgan de la
 * home), asi que basta con dos niveles. Ayuda a que Google muestre la ruta
 * legible en lugar de la URL en los resultados.
 */
export function breadcrumbNode(name: string, canonical: string) {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${canonical}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${site.url}/` },
      { '@type': 'ListItem', position: 2, name, item: canonical },
    ],
  };
}

/* --------------------------------------------------- Servicio y precios */

/**
 * El servicio de alquiler con el FOODD Rental Base como oferta de partida.
 * El precio es el mismo "Desde" que pinta /configuraciones (ConfigCta); el
 * equipamiento extra se presupuesta en /configurador y no se anuncia aqui.
 */
export function serviceOffersNode() {
  const precio = AJUSTES_RESPALDO.precioDesde;
  return {
    '@type': 'Service',
    '@id': `${site.url}/#service`,
    name: 'Alquiler de food truck para eventos',
    serviceType: 'Alquiler de food truck',
    description: site.description,
    provider: ref(ORGANIZATION_ID),
    areaServed: {
      '@type': 'Country',
      name: 'España',
    },
    offers: {
      '@type': 'Offer',
      name: 'FOODD Rental Base',
      description:
        'Remolque con nevera, congelador, zona de trabajo e iluminación. Equipamiento y servicios adicionales bajo presupuesto.',
      price: precio,
      priceCurrency: 'EUR',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: precio,
        priceCurrency: 'EUR',
        valueAddedTaxIncluded: false,
        unitText: 'día',
        referenceQuantity: {
          '@type': 'QuantitativeValue',
          value: 1,
          unitCode: 'DAY',
        },
      },
      availability: 'https://schema.org/InStock',
      url: `${site.url}/configurador`,
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
      acceptedAnswer: { '@type': 'Answer', text: textoPlanoFaq(faq.answer) },
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
