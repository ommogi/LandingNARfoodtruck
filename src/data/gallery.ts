/**
 * Fotografias y filtros de la pagina /galeria (secciones 3.1 y 6 de la guia).
 * Orden aprobado: exterior principal, interior general, trasera, detalle de
 * iluminacion, lateral, equipamiento, pasillo y estabilizadores. Las ocho
 * primeras son las fotos reales del truck y forman el collage inicial.
 */

import type { ImageMetadata } from 'astro';

import type { IconName } from '../components/icons';

import truckExterior01 from '../assets/gallery/truck-exterior-01.webp';
import truckTrasera from '../assets/gallery/truck-trasera.webp';
import interior01 from '../assets/gallery/interior-01.webp';
import interior02 from '../assets/gallery/interior-02.webp';
import interior03 from '../assets/gallery/interior-03.webp';
import heroInterior from '../assets/gallery/hero-interior.webp';
import detalleLamparas from '../assets/gallery/detalle-lamparas.webp';
import detalleEquipamiento from '../assets/gallery/detalle-equipamiento.webp';

/* Sesion de fotos de octubre de 2026: truck real por dentro, detalles y maquinas. */
import detalleCajaLuz from '../assets/gallery/detalle-caja-luz.webp';
import detalleCierreArmarios from '../assets/gallery/detalle-cierre-armarios.webp';
import detalleEnchufes from '../assets/gallery/detalle-enchufes-encimera.webp';
import detalleEnganche from '../assets/gallery/detalle-enganche-puerta.webp';
import detalleFregadero from '../assets/gallery/detalle-fregadero.webp';
import detalleIluminacion from '../assets/gallery/detalle-iluminacion-interior.webp';
import detalleInterruptores from '../assets/gallery/detalle-interruptores.webp';
import detalleLucesLed from '../assets/gallery/detalle-luces-led.webp';
import detalleRegulador from '../assets/gallery/detalle-regulador-extraccion.webp';
import detalleTomaExterior from '../assets/gallery/detalle-toma-exterior.webp';
import detalleVentanaExterior from '../assets/gallery/detalle-ventana-exterior.webp';
import detalleVentanaInterior from '../assets/gallery/detalle-ventana-interior.webp';
import truckTraseraDia from '../assets/gallery/truck-trasera-dia.webp';
import truckVistaDelantera from '../assets/gallery/truck-vista-delantera.webp';
import eventoLateralNoche from '../assets/gallery/evento-lateral-noche.webp';
import eventoInteriorNoche from '../assets/gallery/evento-interior-noche.webp';
import eventoGofresDia from '../assets/gallery/evento-gofres-dia.webp';
import eventoGofresNoche from '../assets/gallery/evento-gofres-noche.webp';
import interiorArmarios from '../assets/gallery/interior-armarios.webp';
import interiorCampana from '../assets/gallery/interior-campana.webp';
import interiorEncimera1 from '../assets/gallery/interior-encimera-1.webp';
import interiorEncimera2 from '../assets/gallery/interior-encimera-2.webp';
import interiorEncimera3 from '../assets/gallery/interior-encimera-3.webp';
import interiorEstanteria1 from '../assets/gallery/interior-estanteria-1.webp';
import interiorEstanteria2 from '../assets/gallery/interior-estanteria-2.webp';
import interiorEstanteria3 from '../assets/gallery/interior-estanteria-3.webp';
import equipoBotellero from '../assets/gallery/equipo-botellero.webp';
import equipoFuegos from '../assets/gallery/equipo-fuegos.webp';
import equipoCongelador from '../assets/gallery/equipo-congelador.webp';
import equipoCrepera from '../assets/gallery/equipo-crepera.webp';
import equipoFreidora from '../assets/gallery/equipo-freidora.webp';
import equipoPlancha from '../assets/gallery/equipo-plancha.webp';

import gallery01 from '../assets/gallery-01.webp';
import gallery02 from '../assets/gallery-02.webp';
import gallery03 from '../assets/gallery-03.webp';
import gallery04 from '../assets/gallery-04.webp';
import gallery05 from '../assets/gallery-05.webp';
import gallery06 from '../assets/gallery-06.webp';

export type GalleryCategory = 'truck' | 'interior' | 'detail' | 'event' | 'equipment';

export interface GalleryPhoto {
  src: ImageMetadata;
  alt: string;
  category: GalleryCategory;
  /** Ocupa el doble de ancho en el collage de escritorio. */
  wide?: boolean;
  /** Recorte sobre blanco (maquinas): se ve entera, sin recortar. */
  contain?: boolean;
}

/** Imagen del hero: el interior mas limpio y simetrico (guia, seccion 6). */
export const galleryHeroImage = heroInterior;

export const galleryPhotos: GalleryPhoto[] = [
  {
    src: truckExterior01,
    alt: 'Food truck azul NAR iluminado de noche con la ventana de servicio abierta',
    category: 'truck',
    wide: true,
  },
  {
    src: interior01,
    alt: 'Vista general del interior profesional en acero inoxidable',
    category: 'interior',
    wide: true,
  },
  {
    src: truckTrasera,
    alt: 'Vista posterior del remolque con iluminación perimetral encendida',
    category: 'truck',
  },
  {
    src: detalleLamparas,
    alt: 'Lámparas térmicas colgantes y acabados interiores del food truck',
    category: 'detail',
  },
  {
    src: gallery05,
    alt: 'Food truck NAR con iluminación LED al atardecer',
    category: 'truck',
  },
  {
    src: interior02,
    alt: 'Superficies de trabajo, planchas y equipamiento instalado en el interior',
    category: 'equipment',
  },
  {
    src: heroInterior,
    alt: 'Pasillo central del food truck con planchas y lámparas de calor',
    category: 'interior',
  },
  {
    src: detalleEquipamiento,
    alt: 'Lateral del truck con lanza de enganche y estabilizadores instalados',
    category: 'equipment',
  },
  {
    src: gallery01,
    alt: 'Food truck NAR iluminado en una plaza durante un evento nocturno',
    category: 'event',
  },
  {
    src: gallery02,
    alt: 'Food truck NAR en una fiesta al aire libre decorada con globos y guirnaldas',
    category: 'event',
  },
  {
    src: interior03,
    alt: 'Encimeras y zona de trabajo del interior en acero inoxidable',
    category: 'interior',
  },
  {
    src: gallery03,
    alt: 'Lateral del food truck NAR con el logotipo iluminado',
    category: 'truck',
  },
  {
    src: gallery06,
    alt: 'Ventana de servicio del food truck abierta y lista para el evento',
    category: 'detail',
  },
  {
    src: gallery04,
    alt: 'Interior del food truck con cocina de acero inoxidable equipada',
    category: 'interior',
  },
  {
    src: eventoGofresNoche,
    alt: 'Food truck NAR rotulado con su marca de gofres, abierto y sirviendo en un evento nocturno',
    category: 'event',
    wide: true,
  },
  {
    src: truckVistaDelantera,
    alt: 'Vista frontal del food truck azul NAR con la lanza de enganche',
    category: 'truck',
  },
  {
    src: interiorCampana,
    alt: 'Campana extractora de acero inoxidable sobre la zona de cocción',
    category: 'interior',
  },
  {
    src: detalleFregadero,
    alt: 'Fregadero doble de acero inoxidable con grifo',
    category: 'detail',
  },
  {
    src: eventoGofresDia,
    alt: 'Food truck NAR con vinilo de gofres y la ventana de servicio abierta de día',
    category: 'event',
  },
  {
    src: interiorEncimera1,
    alt: 'Encimera de trabajo de acero inoxidable junto a la ventana de servicio',
    category: 'interior',
    wide: true,
  },
  {
    src: detalleLucesLed,
    alt: 'Perfil de luces LED en el techo exterior del food truck',
    category: 'detail',
  },
  {
    src: equipoPlancha,
    alt: 'Plancha a gas de acero inoxidable',
    category: 'equipment',
    contain: true,
  },
  {
    src: truckTraseraDia,
    alt: 'Parte trasera del food truck con puerta de acceso y pilotos',
    category: 'truck',
  },
  {
    src: interiorEstanteria1,
    alt: 'Estantería superior de acero inoxidable en el interior',
    category: 'interior',
  },
  {
    src: detalleIluminacion,
    alt: 'Lámparas colgantes de acero sobre la zona de servicio',
    category: 'detail',
  },
  {
    src: eventoLateralNoche,
    alt: 'Lateral del food truck NAR iluminado por la noche en una plaza',
    category: 'event',
  },
  {
    src: equipoCrepera,
    alt: 'Crepera doble a gas',
    category: 'equipment',
    contain: true,
  },
  {
    src: interiorEncimera2,
    alt: 'Encimeras y armarios inferiores del interior en acero inoxidable',
    category: 'interior',
  },
  {
    src: detalleCajaLuz,
    alt: 'Cuadro eléctrico con diferenciales en el interior',
    category: 'detail',
  },
  {
    src: eventoInteriorNoche,
    alt: 'Interior del food truck iluminado durante un evento nocturno',
    category: 'event',
  },
  {
    src: equipoFuegos,
    alt: 'Cocina a gas de dos quemadores',
    category: 'equipment',
    contain: true,
  },
  {
    src: interiorArmarios,
    alt: 'Armarios de acero inoxidable bajo la encimera',
    category: 'interior',
  },
  {
    src: detalleVentanaExterior,
    alt: 'Ventana lateral pequeña vista desde el exterior',
    category: 'detail',
  },
  {
    src: equipoFreidora,
    alt: 'Freidora a gas de dos cubetas',
    category: 'equipment',
    contain: true,
  },
  {
    src: interiorEncimera3,
    alt: 'Zona de trabajo y pasillo interior del food truck',
    category: 'interior',
  },
  {
    src: detalleInterruptores,
    alt: 'Interruptores de luces de ventana y lámparas colgantes',
    category: 'detail',
  },
  {
    src: interiorEstanteria2,
    alt: 'Estantería superior y fregadero del interior',
    category: 'interior',
  },
  {
    src: detalleTomaExterior,
    alt: 'Toma eléctrica exterior para la conexión del food truck',
    category: 'detail',
  },
  {
    src: equipoCongelador,
    alt: 'Congelador bajo encimera de dos puertas',
    category: 'equipment',
    contain: true,
  },
  {
    src: interiorEstanteria3,
    alt: 'Estantería superior junto a la campana extractora',
    category: 'interior',
  },
  {
    src: detalleEnchufes,
    alt: 'Enchufes bajo la encimera de trabajo',
    category: 'detail',
  },
  {
    src: equipoBotellero,
    alt: 'Botellero refrigerado con puerta de cristal',
    category: 'equipment',
    contain: true,
  },
  {
    src: detalleRegulador,
    alt: 'Regulador de la extracción de la campana',
    category: 'detail',
  },
  {
    src: detalleCierreArmarios,
    alt: 'Cierres de seguridad de los armarios',
    category: 'detail',
  },
  {
    src: detalleEnganche,
    alt: 'Enganche de la puerta de la ventana de servicio',
    category: 'detail',
  },
  {
    src: detalleVentanaInterior,
    alt: 'Ventana pequeña vista desde el interior del food truck',
    category: 'detail',
  },
];

export interface GalleryFilter {
  /** 'all' no filtra: muestra todas las fotografias. */
  value: GalleryCategory | 'all';
  label: string;
  icon: IconName;
}

export const galleryFilters: GalleryFilter[] = [
  { value: 'all', label: 'Todas', icon: 'grid' },
  { value: 'truck', label: 'El truck', icon: 'truck' },
  { value: 'interior', label: 'Interior', icon: 'window' },
  { value: 'detail', label: 'Detalles', icon: 'tag' },
  { value: 'event', label: 'Eventos', icon: 'users' },
  { value: 'equipment', label: 'Equipamiento', icon: 'kitchen' },
];
