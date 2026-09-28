-- Imagenes del configurador: solo WebP y 500 KB como mucho.
--
-- Mismas reglas que src/data/imagenes.ts, que ya aplican el panel y
-- /api/admin/configurador-imagen. El bucket es la ultima barrera por si
-- alguien sube directamente con la sesion de admin.

update storage.buckets
set file_size_limit = 512000,
    allowed_mime_types = array['image/webp']
where id = 'configurador';
