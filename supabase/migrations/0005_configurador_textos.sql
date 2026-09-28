-- Textos, imagenes fijas y listas pequenas del configurador, editables desde el
-- editor visual del panel.
--
--   textos  { "<clave>": "<valor>" }  claves de src/data/configurador-textos.ts.
--           Una clave ausente o vacia usa el texto por defecto del codigo.
--   listas  { "<lista>": [...] }       necesidades, categorias, situaciones…
--           Una lista ausente usa la del codigo.
--
-- Mismas politicas que el resto de configurador_ajustes (0003): lectura
-- publica, escritura solo es_admin().

alter table public.configurador_ajustes
  add column if not exists textos jsonb not null default '{}'::jsonb,
  add column if not exists listas jsonb not null default '{}'::jsonb;
