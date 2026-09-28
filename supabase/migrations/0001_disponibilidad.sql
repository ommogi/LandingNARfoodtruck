-- Disponibilidad gestionada por el cliente desde /admin.
--
-- Dos tablas y nada mas: las fechas que el cliente marca y una unica fila de
-- ajustes. Todo lo que no aparece en `disponibilidad` se considera libre.
--
-- Los rangos se guardan expandidos en dias sueltos. Con 12 meses visibles son
-- 365 filas como mucho, asi que no compensa un modelo de intervalos y la
-- lectura sigue siendo una simple lista de fechas.

create table if not exists public.disponibilidad (
  fecha       date primary key,
  estado      text not null check (estado in ('ocupado', 'poca')),
  nota        text,
  updated_at  timestamptz not null default now()
);

create table if not exists public.ajustes (
  id                   int primary key default 1 check (id = 1),
  min_dias_antelacion  int not null default 7  check (min_dias_antelacion between 0 and 90),
  meses_visibles       int not null default 12 check (meses_visibles between 1 and 24),
  updated_at           timestamptz not null default now()
);

-- Fila unica de ajustes. `on conflict` para que la migracion sea reejecutable.
insert into public.ajustes (id) values (1) on conflict (id) do nothing;

alter table public.disponibilidad enable row level security;
alter table public.ajustes        enable row level security;

-- Lectura publica: es exactamente lo que el calendario ya ensena a cualquier
-- visitante. No hay nada que ocultar y asi el endpoint publico no necesita
-- credenciales privilegiadas.
drop policy if exists "lectura publica" on public.disponibilidad;
create policy "lectura publica" on public.disponibilidad
  for select to anon, authenticated using (true);

drop policy if exists "lectura publica" on public.ajustes;
create policy "lectura publica" on public.ajustes
  for select to anon, authenticated using (true);

-- Escritura solo con sesion iniciada.
--
-- IMPORTANTE: esto solo es seguro con el registro publico DESACTIVADO en
-- Supabase Auth. Si cualquiera pudiera crear una cuenta, cualquiera seria
-- `authenticated` y podria escribir. Ver docs/disponibilidad.md.
drop policy if exists "escritura admin" on public.disponibilidad;
create policy "escritura admin" on public.disponibilidad
  for all to authenticated using (true) with check (true);

drop policy if exists "escritura admin" on public.ajustes;
create policy "escritura admin" on public.ajustes
  for all to authenticated using (true) with check (true);

-- El calendario siempre consulta de hoy en adelante y ordenado por fecha.
create index if not exists disponibilidad_fecha_idx on public.disponibilidad (fecha);
