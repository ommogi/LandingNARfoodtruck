/**
 * Subida de una imagen del configurador al bucket `configurador` de Supabase.
 *
 * Solo se admite WebP de 500 KB como mucho (reglas en src/data/imagenes.ts).
 * Aun asi se pasa por sharp (sin EXIF, 1200 px de ancho como mucho); si la
 * recodificacion pesa mas que el original, se sube el original. Sube con la
 * sesion del admin: la politica de storage (migracion 0004) exige es_admin().
 *
 * Solo devuelve la URL publica. Asignarla a una opcion es un cambio mas del
 * panel y se guarda con el resto al pulsar "Guardar cambios".
 */

import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { validarImagen } from '../../../data/imagenes';

export const prerender = false;

/** Firma de un WebP: "RIFF" + tamano + "WEBP". El MIME lo pone el navegador. */
const esFirmaWebp = (b: Buffer) =>
  b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store' },
  });

export const POST: APIRoute = async ({ request, locals }) => {
  const supabase = locals.supabase;
  if (!supabase) return json({ ok: false, message: 'Base de datos no configurada' }, 503);

  let datos: FormData;
  try {
    datos = await request.formData();
  } catch {
    return json({ ok: false, message: 'Formulario no válido' }, 400);
  }

  const archivo = datos.get('archivo');
  if (!(archivo instanceof File)) return json({ ok: false, message: 'Falta la imagen' }, 422);
  const motivo = validarImagen(archivo);
  if (motivo) return json({ ok: false, message: motivo }, archivo.type === 'image/webp' ? 413 : 415);

  const original = Buffer.from(await archivo.arrayBuffer());
  if (!esFirmaWebp(original)) return json({ ok: false, message: 'Solo se admiten imágenes WebP.' }, 415);

  const base = String(datos.get('id') ?? 'opcion').toLowerCase().replace(/[^a-z0-9_]+/g, '-').slice(0, 40) || 'opcion';

  let webp: Buffer;
  try {
    const recodificada = await sharp(original)
      .rotate()
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    webp = recodificada.length <= original.length ? recodificada : original;
  } catch {
    return json({ ok: false, message: 'No se pudo leer la imagen' }, 422);
  }

  const ruta = `${base}-${Date.now().toString(36)}.webp`;
  const { error } = await supabase.storage
    .from('configurador')
    .upload(ruta, webp, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });

  if (error) {
    console.error('[admin] Error al subir imagen del configurador:', error.message);
    return json({ ok: false, message: 'No se pudo subir la imagen' }, 502);
  }

  const { data } = supabase.storage.from('configurador').getPublicUrl(ruta);
  return json({ ok: true, url: data.publicUrl });
};

export const ALL: APIRoute = () => json({ ok: false, message: 'Método no permitido' }, 405);
