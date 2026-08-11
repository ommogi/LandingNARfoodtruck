/**
 * Identificadores y nombres de las cuatro configuraciones.
 *
 * Vive aparte de ./configuraciones.ts a proposito: ese archivo importa las
 * imagenes de la galeria, y tanto el script del asistente de reserva (que se
 * ejecuta en el navegador) como la ruta /api/presupuesto solo necesitan el par
 * id -> nombre. Separarlo evita arrastrar los assets a esos dos bundles.
 */

export type ConfigId = 'base' | 'compact' | 'profesional' | 'max';

export const configNames: Record<ConfigId, string> = {
  base: 'Base',
  compact: 'Compact',
  profesional: 'Profesional',
  max: 'Max',
};

export const configIds = Object.keys(configNames) as ConfigId[];

/** true solo para los cuatro ids validos: filtra lo que llega del formulario. */
export const isConfigId = (value: string): value is ConfigId => value in configNames;
