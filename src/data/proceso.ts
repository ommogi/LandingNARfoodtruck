/**
 * Pasos del proceso de reserva. Fuente unica: la seccion "Asi trabajamos" de
 * la home y el schema HowTo de esa misma pagina se generan desde aqui.
 *
 * Si cambia el numero de pasos o su redaccion, cambia en los dos sitios a la
 * vez: el schema debe describir exactamente lo que el usuario ve en pantalla.
 */

import type { IconName } from '../components/icons';

export interface ProcessStep {
  icon: IconName;
  title: string;
  text: string;
}

export const processSteps: ProcessStep[] = [
  {
    icon: 'chat',
    title: 'Nos escribes',
    text: 'Cuéntanos tu idea, fecha, lugar y número de invitados.',
  },
  {
    icon: 'pencil',
    title: 'Hablamos contigo',
    text: 'Te asesoramos y te proponemos la mejor opción para tu evento.',
  },
  {
    icon: 'clipboard',
    title: 'Diseñamos la propuesta',
    text: 'Recibes una propuesta personalizada en menos de 24 horas.',
  },
  {
    icon: 'truck',
    title: 'Montamos el food truck',
    text: 'Nos encargamos del transporte, montaje e instalación en el lugar.',
  },
  {
    icon: 'confetti',
    title: 'Disfrutas del evento',
    text: 'Tú te ocupas de disfrutar. Nosotros de que todo salga perfecto.',
  },
];
