/**
 * Reglas de las imagenes que se suben desde el panel. Las comparten el
 * navegador (aviso inmediato, sin peticion) y /api/admin/configurador-imagen,
 * que es quien manda de verdad.
 *
 * Solo WebP y con un peso acotado: la imagen se sirve tal cual en
 * /configurador, y es mas facil exigirla optimizada que arreglarla aqui.
 */

export const IMAGEN_TIPO = 'image/webp';
export const IMAGEN_MAX_BYTES = 500 * 1024;
export const IMAGEN_AYUDA = 'WebP · máx. 500 KB';

/** Motivo por el que no se admite el archivo, o '' si vale. */
export const validarImagen = (archivo: { name: string; type: string; size: number }): string => {
  const esWebp = archivo.type === IMAGEN_TIPO || (!archivo.type && archivo.name.toLowerCase().endsWith('.webp'));
  if (!esWebp) return 'Solo se admiten imágenes WebP.';
  if (archivo.size > IMAGEN_MAX_BYTES) {
    return `La imagen pesa ${Math.round(archivo.size / 1024)} KB; el máximo es 500 KB.`;
  }
  return '';
};
