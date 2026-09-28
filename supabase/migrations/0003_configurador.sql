-- Catalogo del configurador de /configurador, editable desde /admin/configurador.
--
-- Tres piezas con permisos distintos:
--
--   configurador_opciones  lectura publica. Es lo que el visitante ve pintado.
--   configurador_ajustes   lectura publica. Precio "desde", textos de los pasos.
--   configurador_precios   SOLO admins. El precio interno de cada opcion no
--                          puede llegar nunca al navegador.
--
-- El servidor necesita los precios para calcular el desglose del email, pero el
-- proyecto no usa service role key a proposito (ver src/lib/supabase.ts). La
-- salida es precios_configurador(clave): una funcion security definer que solo
-- devuelve algo si recibe la clave guardada en configurador_secreto, tabla con
-- RLS activado y SIN politicas (nadie la lee desde fuera). La misma clave vive
-- en la variable de servidor CONFIGURADOR_PRICING_SECRET. Quien tenga la anon
-- key sigue sin poder ver un solo precio.
--
-- Para fijar la clave (una vez, desde el SQL editor de Supabase):
--   insert into public.configurador_secreto (id, clave) values (1, '<clave larga aleatoria>')
--   on conflict (id) do update set clave = excluded.clave;

create table if not exists public.configurador_opciones (
  id                text primary key check (id ~ '^[a-z0-9_]+(\.[a-z0-9_]+)*$' and length(id) <= 60),
  tipo              text not null check (tipo in (
                      'proyecto', 'subtipo', 'uso', 'subconfig', 'equipo', 'cocina',
                      'cocina_servicio', 'ambientacion', 'branding', 'espacio', 'acceso', 'logistica')),
  padre             text references public.configurador_opciones (id) on delete cascade,
  nombre            text not null check (length(nombre) between 1 and 80),
  descripcion       text not null default '' check (length(descripcion) <= 400),
  imagen            text check (imagen is null or length(imagen) <= 500),
  icono             text check (icono is null or length(icono) <= 40),
  etiquetas         text[] not null default '{}',
  categoria         text,
  incluido          boolean not null default false,
  recomendado_para  text[] not null default '{}',
  visible_para      text[] not null default '{}',
  mostrar_cocina    boolean not null default false,
  a_medida          boolean not null default false,
  aviso             text check (aviso is null or length(aviso) <= 60),
  orden             int not null default 0,
  activo            boolean not null default true,
  updated_at        timestamptz not null default now()
);

create index if not exists configurador_opciones_tipo_idx on public.configurador_opciones (tipo, orden);

create table if not exists public.configurador_precios (
  opcion_id   text primary key,
  precio      numeric(10, 2) not null default 0 check (precio >= 0 and precio < 1000000),
  unidad      text not null default 'proyecto' check (unidad in ('dia', 'proyecto', 'persona')),
  updated_at  timestamptz not null default now()
);

create table if not exists public.configurador_ajustes (
  id              int primary key default 1 check (id = 1),
  precio_desde    numeric(10, 2) not null default 450 check (precio_desde >= 0),
  texto_incluye   text not null default '' check (length(texto_incluye) <= 400),
  whatsapp        text not null default '' check (whatsapp ~ '^[0-9]{0,15}$'),
  -- { "proyecto": { "titulo": "...", "subtitulo": "..." }, ... }. Los pasos que
  -- falten usan el texto por defecto de src/data/configurador.ts.
  pasos           jsonb not null default '{}'::jsonb,
  updated_at      timestamptz not null default now()
);

create table if not exists public.configurador_secreto (
  id     int primary key default 1 check (id = 1),
  clave  text not null check (length(clave) >= 24)
);

alter table public.configurador_opciones enable row level security;
alter table public.configurador_precios  enable row level security;
alter table public.configurador_ajustes  enable row level security;
alter table public.configurador_secreto  enable row level security;

-- Opciones y ajustes: lectura publica, escritura solo admins (es_admin() de 0002).
drop policy if exists "lectura publica" on public.configurador_opciones;
create policy "lectura publica" on public.configurador_opciones
  for select to anon, authenticated using (true);

drop policy if exists "escritura admin" on public.configurador_opciones;
create policy "escritura admin" on public.configurador_opciones
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

drop policy if exists "lectura publica" on public.configurador_ajustes;
create policy "lectura publica" on public.configurador_ajustes
  for select to anon, authenticated using (true);

drop policy if exists "escritura admin" on public.configurador_ajustes;
create policy "escritura admin" on public.configurador_ajustes
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- Precios: ni siquiera lectura publica.
drop policy if exists "solo admin" on public.configurador_precios;
create policy "solo admin" on public.configurador_precios
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- configurador_secreto: RLS activado y ninguna politica = inaccesible via API.

create or replace function public.precios_configurador(clave text)
returns table (opcion_id text, precio numeric, unidad text)
language sql
stable
security definer
set search_path = public
as $$
  select p.opcion_id, p.precio, p.unidad
  from public.configurador_precios p
  where exists (
    select 1 from public.configurador_secreto s
    where s.id = 1 and s.clave = precios_configurador.clave
  );
$$;

revoke all on function public.precios_configurador(text) from public;
grant execute on function public.precios_configurador(text) to anon, authenticated;

insert into public.configurador_ajustes (id, precio_desde, texto_incluye)
values (1, 450, 'Incluye: remolque, nevera, congelador, zona de trabajo, iluminación e instalaciones disponibles del remolque.')
on conflict (id) do nothing;

-- Precio interno del alquiler base (por dia). No es una opcion visible.
insert into public.configurador_precios (opcion_id, precio, unidad)
values ('rental_base', 450, 'dia')
on conflict (opcion_id) do nothing;

-- Semilla: generada desde OPCIONES_RESPALDO de src/data/configurador.ts.
-- `on conflict do nothing`: reejecutar no pisa lo editado en el admin.
insert into public.configurador_opciones (id, tipo, padre, nombre, descripcion, imagen, icono, etiquetas, categoria, incluido, recomendado_para, visible_para, mostrar_cocina, a_medida, aviso, orden, activo) values
  ('evento', 'proyecto', null, 'Evento', 'Bodas, celebraciones, eventos corporativos, ferias y festivales.', '/configurador/proyecto-evento.webp', 'calendar', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 1, true),
  ('gastronomia', 'proyecto', null, 'Gastronomía', 'Un espacio profesional para cocina, café, bar o propuestas gastronómicas.', '/configurador/proyecto-gastronomia.webp', 'chef', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 2, true),
  ('marca', 'proyecto', null, 'Marca & Activación', 'Promociones, sampling, lanzamientos, hospitality y campañas itinerantes.', '/configurador/proyecto-marca.webp', 'megaphone', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 3, true),
  ('otro', 'proyecto', null, 'Otro proyecto', 'Cuéntanos tu idea. Si tu proyecto no encaja en las categorías anteriores, lo analizamos juntos.', '/configurador/proyecto-otro.webp', 'lightbulb', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, true, null, 4, true),
  ('evento.boda', 'subtipo', 'evento', 'Boda / Celebración', 'Bodas, aniversarios y celebraciones.', null, 'rings', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 1, true),
  ('evento.corporativo', 'subtipo', 'evento', 'Corporativo', 'Eventos de empresa, congresos y encuentros profesionales.', null, 'briefcase', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 2, true),
  ('evento.feria', 'subtipo', 'evento', 'Feria / Festival', 'Ferias, festivales, mercados y eventos abiertos al público.', null, 'tent', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 3, true),
  ('evento.otro', 'subtipo', 'evento', 'Otro evento', 'Un formato diferente.', null, 'ellipsis', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, true, null, 4, true),
  ('gastronomia.cocina', 'subtipo', 'gastronomia', 'Cocina profesional', '', null, 'utensils', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 1, true),
  ('gastronomia.cafe_dulces', 'subtipo', 'gastronomia', 'Café y dulces', '', null, 'cup', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 2, true),
  ('gastronomia.bar', 'subtipo', 'gastronomia', 'Bar y bebidas', '', null, 'wine', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 3, true),
  ('gastronomia.propuestas', 'subtipo', 'gastronomia', 'Propuestas gastronómicas', '', null, 'dish', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 4, true),
  ('marca.activacion', 'subtipo', 'marca', 'Activación de marca', '', null, 'target', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 1, true),
  ('marca.sampling', 'subtipo', 'marca', 'Sampling', '', null, 'gift', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 2, true),
  ('marca.lanzamiento', 'subtipo', 'marca', 'Lanzamiento', '', null, 'sparkles', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 3, true),
  ('marca.hospitality', 'subtipo', 'marca', 'Hospitality', '', null, 'users', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 4, true),
  ('marca.roadshow', 'subtipo', 'marca', 'Roadshow', 'Campaña itinerante por varias ciudades.', '/configurador/subtipo-roadshow.webp', 'route', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 5, true),
  ('marca.otro', 'subtipo', 'marca', 'Otro', '', null, 'ellipsis', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, true, null, 6, true),
  ('food', 'uso', null, 'Food', 'Cocina y preparación gastronómica.', '/configurador/uso-food.webp', 'utensils', array['Street Food', 'Catering', 'Cocina']::text[], null, false, '{}'::text[], '{}'::text[], true, false, null, 1, true),
  ('coffee', 'uso', null, 'Coffee', 'Café y bebidas calientes.', '/configurador/uso-coffee.webp', 'cup', array['Coffee Point', 'Coffee Catering', 'Corporate']::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 2, true),
  ('bar', 'uso', null, 'Bar', 'Bebidas, cocktails y servicio de barra.', '/configurador/uso-bar.webp', 'wine', array['Cocktails', 'Beer', 'Drinks']::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 3, true),
  ('sweet', 'uso', null, 'Sweet', 'Crepes, gofres y propuestas dulces.', '/configurador/uso-sweet.webp', 'cake', array['Crepes', 'Gofres', 'Sweet']::text[], null, false, '{}'::text[], '{}'::text[], true, false, null, 4, true),
  ('promo', 'uso', null, 'Promo / Display', 'Punto de atención, promoción, sampling o presentación de producto.', '/configurador/uso-promo.webp', 'megaphone', array['Sampling', 'Brand Activation']::text[], null, false, '{}'::text[], array['marca']::text[], false, false, null, 5, true),
  ('food.street_food', 'subconfig', 'food', 'Street Food', 'Para hamburguesas, bocadillos, plancha y propuestas de servicio rápido.', null, 'hamburger', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 1, true),
  ('food.cocina_completa', 'subconfig', 'food', 'Cooking', 'Para elaboraciones que necesitan una zona de cocina más completa.', null, 'utensils', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 2, true),
  ('food.horno', 'subconfig', 'food', 'Bakery / Hot', 'Para horneado, calentamiento y preparaciones calientes.', null, 'microwave', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 3, true),
  ('food.a_medida', 'subconfig', 'food', 'Food a medida', 'En el siguiente paso podrás elegir equipamiento.', null, 'sliders', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, true, null, 4, true),
  ('coffee.point', 'subconfig', 'coffee', 'Coffee Point', 'Café de calidad con un servicio ágil.', null, 'cup', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 1, true),
  ('coffee.sweet', 'subconfig', 'coffee', 'Coffee & Sweet', 'Café acompañado de crepes, gofres o bollería.', null, 'croissant', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 2, true),
  ('coffee.a_medida', 'subconfig', 'coffee', 'Coffee a medida', 'En el siguiente paso podrás elegir equipamiento.', null, 'sliders', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, true, null, 3, true),
  ('bar.drinks', 'subconfig', 'bar', 'Drinks & Cocktails', 'Barra de bebidas y coctelería.', null, 'martini', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 1, true),
  ('bar.beer', 'subconfig', 'bar', 'Beer', 'Servicio de cerveza.', null, 'beer', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, 'Configuración a revisar', 2, true),
  ('bar.a_medida', 'subconfig', 'bar', 'Bar a medida', 'En el siguiente paso podrás elegir equipamiento.', null, 'sliders', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, true, null, 3, true),
  ('sweet.crepes', 'subconfig', 'sweet', 'Crepes', 'Crepes dulces y salados.', null, 'dish', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 1, true),
  ('sweet.gofres', 'subconfig', 'sweet', 'Gofres', 'Gofres y elaboraciones dulces.', null, 'grid', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 2, true),
  ('sweet.coffee_sweet', 'subconfig', 'sweet', 'Coffee & Sweet', 'Dulce acompañado de café.', null, 'croissant', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 3, true),
  ('sweet.full', 'subconfig', 'sweet', 'Full Sweet', 'Crepes, gofres y café en una misma barra.', null, 'cake', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 4, true),
  ('sweet.a_medida', 'subconfig', 'sweet', 'Sweet a medida', 'En el siguiente paso podrás elegir equipamiento.', null, 'sliders', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, true, null, 5, true),
  ('promo.display', 'subconfig', 'promo', 'Promo / Display', 'Punto de atención y presentación de producto.', null, 'megaphone', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 1, true),
  ('promo.a_medida', 'subconfig', 'promo', 'Promo a medida', 'En el siguiente paso podrás elegir equipamiento.', null, 'sliders', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, true, null, 2, true),
  ('equipo.nevera', 'equipo', null, 'Nevera', 'Bajo encimera. Gran capacidad de refrigeración.', null, 'refrigerator', '{}'::text[], 'conservacion', true, '{}'::text[], '{}'::text[], false, false, null, 1, true),
  ('equipo.congelador', 'equipo', null, 'Congelador', 'Bajo encimera. Conservación de productos congelados.', null, 'snowflake', '{}'::text[], 'conservacion', true, '{}'::text[], '{}'::text[], false, false, null, 2, true),
  ('equipo.botellero', 'equipo', null, 'Botellero / Enfriador', 'Ideal para bebidas, vinos y mixers.', null, 'wine', '{}'::text[], 'conservacion', true, '{}'::text[], '{}'::text[], false, false, null, 3, true),
  ('equipo.zona_trabajo', 'equipo', null, 'Zona de trabajo + iluminación', 'Encimera de acero inoxidable e iluminación LED.', null, 'lamp-ceiling', '{}'::text[], 'preparacion', true, '{}'::text[], '{}'::text[], false, false, null, 4, true),
  ('equipo.plancha', 'equipo', null, 'Plancha', 'Para hamburguesas, bocadillos y elaboraciones a la plancha.', null, 'flame', '{}'::text[], 'coccion', false, array['food.street_food', 'food.cocina_completa', 'food.horno']::text[], '{}'::text[], false, false, null, 10, true),
  ('equipo.freidora', 'equipo', null, 'Freidora', 'Para frituras y propuestas de servicio rápido.', null, 'kitchen', '{}'::text[], 'coccion', false, array['food.street_food', 'food.cocina_completa']::text[], '{}'::text[], false, false, null, 11, true),
  ('equipo.fuegos', 'equipo', null, 'Cocina / Fuegos', 'Para cocciones, salsas y recetas más elaboradas.', null, 'flame', '{}'::text[], 'coccion', false, array['food.street_food', 'food.cocina_completa', 'food.horno']::text[], '{}'::text[], false, false, null, 12, true),
  ('equipo.horno', 'equipo', null, 'Horno', 'Para horneado, regeneración y mantenimiento de temperatura.', null, 'microwave', '{}'::text[], 'coccion', false, array['food.street_food', 'food.cocina_completa', 'food.horno']::text[], '{}'::text[], false, false, null, 13, true),
  ('equipo.cafetera', 'equipo', null, 'Cafetera profesional', 'Para café de especialidad.', null, 'cup', '{}'::text[], 'cafe_bebidas', false, array['coffee.point', 'coffee.sweet', 'sweet.crepes', 'sweet.gofres', 'sweet.coffee_sweet', 'sweet.full']::text[], '{}'::text[], false, false, null, 20, true),
  ('equipo.crepera', 'equipo', null, 'Crepera', 'Para crepes y propuestas dulces.', null, 'dish', '{}'::text[], 'dulces', false, array['coffee.sweet', 'sweet.crepes', 'sweet.gofres', 'sweet.coffee_sweet', 'sweet.full']::text[], '{}'::text[], false, false, null, 30, true),
  ('equipo.gofrera', 'equipo', null, 'Gofrera', 'Para gofres y elaboraciones dulces.', null, 'grid', '{}'::text[], 'dulces', false, array['coffee.sweet', 'sweet.crepes', 'sweet.gofres', 'sweet.coffee_sweet', 'sweet.full']::text[], '{}'::text[], false, false, null, 31, true),
  ('equipo.bano_maria', 'equipo', null, 'Baño maría', 'Para mantener la temperatura.', null, 'soup', '{}'::text[], 'conservacion', false, '{}'::text[], '{}'::text[], false, false, null, 40, true),
  ('equipo.tostador', 'equipo', null, 'Tostador', 'Para pan y bollería.', null, 'sandwich', '{}'::text[], 'preparacion', false, '{}'::text[], '{}'::text[], false, false, null, 50, true),
  ('equipo.kit_vasos', 'equipo', null, 'Kit de vasos y tazas', 'Vasos, tazas y tapas desechables o compostables.', null, 'cup', '{}'::text[], 'consumibles', false, '{}'::text[], '{}'::text[], false, false, null, 60, true),
  ('equipo.kit_menaje', 'equipo', null, 'Kit de menaje', 'Platos, cubiertos y servilletas para el servicio.', null, 'utensils', '{}'::text[], 'consumibles', false, '{}'::text[], '{}'::text[], false, false, null, 61, true),
  ('equipo.kit_limpieza', 'equipo', null, 'Kit de limpieza', 'Productos de limpieza e higiene para la jornada.', null, 'drop', '{}'::text[], 'consumibles', false, '{}'::text[], '{}'::text[], false, false, null, 62, true),
  ('cocina.propio', 'cocina', null, 'Solo FOODD', 'Trabajaré con mi propio personal. Tú aportas el personal necesario para desarrollar la actividad.', '/configurador/viaja.webp', 'users', array['FOODD', 'Equipamiento seleccionado', 'Tu propio personal']::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 1, true),
  ('cocina.cocinero', 'cocina', null, 'FOODD + Cocinero', 'Quiero añadir un cocinero profesional para preparar y desarrollar el servicio gastronómico acordado.', '/configurador/cocinero.webp', 'chef', array['Cocinero profesional', 'FOODD', 'Equipamiento seleccionado']::text[], null, false, '{}'::text[], '{}'::text[], false, false, 'Sujeto a disponibilidad', 2, true),
  ('servicio.street_food', 'cocina_servicio', null, 'Street food', '', null, 'hamburger', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 1, true),
  ('servicio.hamburguesas', 'cocina_servicio', null, 'Hamburguesas', '', null, 'hamburger', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 2, true),
  ('servicio.bocadillos', 'cocina_servicio', null, 'Bocadillos', '', null, 'sandwich', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 3, true),
  ('servicio.plancha', 'cocina_servicio', null, 'Plancha', '', null, 'flame', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 4, true),
  ('servicio.crepes', 'cocina_servicio', null, 'Crepes', '', null, 'dish', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 5, true),
  ('servicio.gofres', 'cocina_servicio', null, 'Gofres', '', null, 'grid', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 6, true),
  ('servicio.dulce', 'cocina_servicio', null, 'Dulce', '', null, 'cake', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 7, true),
  ('servicio.otro', 'cocina_servicio', null, 'Otro', '', null, 'ellipsis', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 8, true),
  ('amb.essential', 'ambientacion', null, 'Essential', 'Funcional, limpio y versátil.', '/configurador/amb-essential.webp', null, array['Mesas altas', 'Taburetes', 'Mesas auxiliares', 'Iluminación básica']::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 1, true),
  ('amb.mediterraneo', 'ambientacion', null, 'Mediterráneo', 'Natural, cálido y relajado.', '/configurador/amb-mediterraneo.webp', null, array['Mesas de madera', 'Sillas de fibras', 'Vegetación', 'Iluminación cálida']::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 2, true),
  ('amb.lounge', 'ambientacion', null, 'Lounge', 'Relajado, sofisticado y experiencial.', '/configurador/amb-lounge.webp', null, array['Sofás y butacas', 'Mesas bajas', 'Vegetación', 'Iluminación ambiental']::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 3, true),
  ('amb.a_medida', 'ambientacion', null, 'Ambientación a medida', 'Si ninguno de nuestros ambientes encaja, cuéntanos cómo imaginas el espacio y prepararemos una propuesta personalizada.', null, 'sliders', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, true, null, 4, true),
  ('brand.ligero', 'branding', null, 'Vinilado ligero', 'Pequeños elementos de marca (logotipo, vinilos discretos).', '/configurador/brand-ligero.webp', null, array['Logotipo + detalles']::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 1, true),
  ('brand.parcial', 'branding', null, 'Vinilado parcial', 'Personalización en zonas seleccionadas del remolque.', '/configurador/brand-parcial.webp', null, array['Gráfica parcial + logotipo']::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 2, true),
  ('brand.total', 'branding', null, 'Vinilado total', 'Personalización completa del remolque con tu marca.', '/configurador/brand-total.webp', null, array['Vinilado integral']::text[], null, false, '{}'::text[], '{}'::text[], false, false, 'Sujeto a valoración', 3, true),
  ('brand.a_medida', 'branding', null, 'A medida', 'Diseño totalmente personalizado según tus necesidades.', '/configurador/brand-medida.webp', null, array['Diseño exclusivo']::text[], null, false, '{}'::text[], '{}'::text[], false, true, null, 4, true),
  ('espacio.exterior', 'espacio', null, 'Exterior', 'Espacio completamente al aire libre.', null, 'sun', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 1, true),
  ('espacio.interior', 'espacio', null, 'Interior', 'FOODD se instalará dentro de un recinto.', null, 'house', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 2, true),
  ('espacio.cubierto', 'espacio', null, 'Cubierto / Semicubierto', 'Espacio exterior con cubierta o protección.', null, 'umbrella', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 3, true),
  ('espacio.no_se', 'espacio', null, 'Todavía no lo sé', 'Aún no lo tengo definido.', null, 'help', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 4, true),
  ('acceso.si', 'acceso', null, 'Sí, sin problemas', '', null, null, '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 1, true),
  ('acceso.limitado', 'acceso', null, 'Sí, con alguna limitación', '', null, null, '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 2, true),
  ('acceso.no_se', 'acceso', null, 'No lo sé', '', null, null, '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 3, true),
  ('acceso.no', 'acceso', null, 'No, acceso complicado', '', null, null, '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 4, true),
  ('logistica.entrega', 'logistica', null, 'Entrega y recogida', 'Llevamos FOODD a la ubicación acordada y lo recogemos al finalizar.', null, 'truck', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 1, true),
  ('logistica.instalacion', 'logistica', null, 'Instalación completa', 'Entrega, posicionamiento y preparación de todo lo contratado, además de la recogida.', null, 'tools', '{}'::text[], null, false, '{}'::text[], '{}'::text[], false, false, null, 2, true)
on conflict (id) do nothing;

-- Precios a 0 para que el admin los rellene. Unidad por defecto segun el tipo.
insert into public.configurador_precios (opcion_id, precio, unidad) values
  ('evento', 0, 'proyecto'),
  ('gastronomia', 0, 'proyecto'),
  ('marca', 0, 'proyecto'),
  ('otro', 0, 'proyecto'),
  ('evento.boda', 0, 'proyecto'),
  ('evento.corporativo', 0, 'proyecto'),
  ('evento.feria', 0, 'proyecto'),
  ('evento.otro', 0, 'proyecto'),
  ('gastronomia.cocina', 0, 'proyecto'),
  ('gastronomia.cafe_dulces', 0, 'proyecto'),
  ('gastronomia.bar', 0, 'proyecto'),
  ('gastronomia.propuestas', 0, 'proyecto'),
  ('marca.activacion', 0, 'proyecto'),
  ('marca.sampling', 0, 'proyecto'),
  ('marca.lanzamiento', 0, 'proyecto'),
  ('marca.hospitality', 0, 'proyecto'),
  ('marca.roadshow', 0, 'proyecto'),
  ('marca.otro', 0, 'proyecto'),
  ('food', 0, 'proyecto'),
  ('coffee', 0, 'proyecto'),
  ('bar', 0, 'proyecto'),
  ('sweet', 0, 'proyecto'),
  ('promo', 0, 'proyecto'),
  ('food.street_food', 0, 'proyecto'),
  ('food.cocina_completa', 0, 'proyecto'),
  ('food.horno', 0, 'proyecto'),
  ('food.a_medida', 0, 'proyecto'),
  ('coffee.point', 0, 'proyecto'),
  ('coffee.sweet', 0, 'proyecto'),
  ('coffee.a_medida', 0, 'proyecto'),
  ('bar.drinks', 0, 'proyecto'),
  ('bar.beer', 0, 'proyecto'),
  ('bar.a_medida', 0, 'proyecto'),
  ('sweet.crepes', 0, 'proyecto'),
  ('sweet.gofres', 0, 'proyecto'),
  ('sweet.coffee_sweet', 0, 'proyecto'),
  ('sweet.full', 0, 'proyecto'),
  ('sweet.a_medida', 0, 'proyecto'),
  ('promo.display', 0, 'proyecto'),
  ('promo.a_medida', 0, 'proyecto'),
  ('equipo.nevera', 0, 'dia'),
  ('equipo.congelador', 0, 'dia'),
  ('equipo.botellero', 0, 'dia'),
  ('equipo.zona_trabajo', 0, 'dia'),
  ('equipo.plancha', 0, 'dia'),
  ('equipo.freidora', 0, 'dia'),
  ('equipo.fuegos', 0, 'dia'),
  ('equipo.horno', 0, 'dia'),
  ('equipo.cafetera', 0, 'dia'),
  ('equipo.crepera', 0, 'dia'),
  ('equipo.gofrera', 0, 'dia'),
  ('equipo.bano_maria', 0, 'dia'),
  ('equipo.tostador', 0, 'dia'),
  ('equipo.kit_vasos', 0, 'dia'),
  ('equipo.kit_menaje', 0, 'dia'),
  ('equipo.kit_limpieza', 0, 'dia'),
  ('cocina.propio', 0, 'dia'),
  ('cocina.cocinero', 0, 'dia'),
  ('servicio.street_food', 0, 'proyecto'),
  ('servicio.hamburguesas', 0, 'proyecto'),
  ('servicio.bocadillos', 0, 'proyecto'),
  ('servicio.plancha', 0, 'proyecto'),
  ('servicio.crepes', 0, 'proyecto'),
  ('servicio.gofres', 0, 'proyecto'),
  ('servicio.dulce', 0, 'proyecto'),
  ('servicio.otro', 0, 'proyecto'),
  ('amb.essential', 0, 'proyecto'),
  ('amb.mediterraneo', 0, 'proyecto'),
  ('amb.lounge', 0, 'proyecto'),
  ('amb.a_medida', 0, 'proyecto'),
  ('brand.ligero', 0, 'proyecto'),
  ('brand.parcial', 0, 'proyecto'),
  ('brand.total', 0, 'proyecto'),
  ('brand.a_medida', 0, 'proyecto'),
  ('espacio.exterior', 0, 'proyecto'),
  ('espacio.interior', 0, 'proyecto'),
  ('espacio.cubierto', 0, 'proyecto'),
  ('espacio.no_se', 0, 'proyecto'),
  ('acceso.si', 0, 'proyecto'),
  ('acceso.limitado', 0, 'proyecto'),
  ('acceso.no_se', 0, 'proyecto'),
  ('acceso.no', 0, 'proyecto'),
  ('logistica.entrega', 0, 'proyecto'),
  ('logistica.instalacion', 0, 'proyecto')
on conflict (opcion_id) do nothing;
