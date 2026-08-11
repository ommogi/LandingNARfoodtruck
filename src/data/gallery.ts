/**
 * Fotografias y filtros de la pagina /galeria (secciones 3.1 y 6 de la guia).
 * Orden aprobado: exterior principal, interior general, trasera, detalle de
 * iluminacion, lateral, equipamiento, pasillo y estabilizadores. Las ocho
 * primeras son las fotos reales del truck y forman el collage inicial.
 */

import type { ImageMetadata } from 'astro';

import type { IconName } from '../components/icons';

import truckExterior01 from '../assets/gallery/truck-exterior-01.jpg';
import truckTrasera from '../assets/gallery/truck-trasera.jpg';
import interior01 from '../assets/gallery/interior-01.jpg';
import interior02 from '../assets/gallery/interior-02.jpg';
import interior03 from '../assets/gallery/interior-03.jpg';
import heroInterior from '../assets/gallery/hero-interior.jpg';
import detalleLamparas from '../assets/gallery/detalle-lamparas.jpg';
import detalleEquipamiento from '../assets/gallery/detalle-equipamiento.jpg';

import gallery01 from '../assets/gallery-01.png';
import gallery02 from '../assets/gallery-02.png';
import gallery03 from '../assets/gallery-03.png';
import gallery04 from '../assets/gallery-04.jpg';
import gallery05 from '../assets/gallery-05.jpg';
import gallery06 from '../assets/gallery-06.jpg';

export type GalleryCategory = 'truck' | 'interior' | 'detail' | 'event' | 'equipment';

export interface GalleryPhoto {
  src: ImageMetadata;
  alt: string;
  category: GalleryCategory;
  /** Ocupa el doble de ancho en el collage de escritorio. */
  wide?: boolean;
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
  { value: 'equipment', label: 'Equipo', icon: 'wrench' },
];
