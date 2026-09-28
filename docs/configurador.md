# Configurador FOODD (`/configurador`)

Configurador en 10 pasos que sustituye al antiguo asistente de reserva
(BookingModal). Todos los CTAs de «Consultar/Comprobar disponibilidad» llevan aquí.

| # | Paso | Notas |
|---|---|---|
| 1 | Tu proyecto | Evento · Gastronomía · Marca & Activación · Otro, con subtipos |
| 2 | Fecha y disponibilidad | Un día, periodo, varias fechas o sin fecha. Roadshow: paradas ciudad + fecha |
| 3 | Configuración | Food / Coffee / Bar / Sweet (+ Promo solo en Marca & Activación) |
| 4 | Equipamiento | Incluido · Recomendado (nunca preseleccionado) · Catálogo con Consumibles |
| 5 | Servicio de cocina | Solo aparece si el uso tiene «Mostrar el paso Servicio de cocina» |
| 6 | Ambientación | Essential · Mediterráneo · Lounge · A medida |
| 7 | Branding | Vinilado ligero · parcial · total · A medida |
| 8 | Ubicación y logística | Roadshow: una tarjeta por parada |
| 9 | Resumen | Sin precios ni totales |
| 10 | Solicitud | Contacto y envío. Genera una referencia `FOODD-AAAA-NNNNN` |

---

## Dónde vive cada cosa

| Qué | Dónde |
|---|---|
| Tipos, pasos, catálogo de respaldo, reglas de completitud | `src/data/configurador.ts` |
| Lectura de catálogo y precios, cálculo del desglose | `src/lib/configurador-server.ts` |
| Página | `src/pages/configurador.astro` → `src/components/configurador/ConfiguradorApp.astro` (compartido con la vista previa del editor) |
| Lógica del navegador | `src/scripts/configurador/` (ver cabecera de `index.ts`) |
| Estilos | `src/styles/configurador.css` |
| Envío | `src/pages/api/configurador.ts` |
| Panel | `/{ADMIN_PATH}/configurador` (editor visual) y `/{ADMIN_PATH}/configurador-lista` → `src/pages/admin/` |
| Textos y listas editables | `src/data/configurador-textos.ts` |
| Base de datos | `supabase/migrations/0003_configurador.sql`, `0004_configurador_storage.sql` |
| Imágenes iniciales | `public/configurador/*.webp` |

---

## Puesta en marcha

1. Aplicar las migraciones `0003`, `0004` y `0005` en Supabase (SQL editor o `supabase db push`). **Ya aplicadas en `nar-foodtruck`.**
2. Generar una clave larga aleatoria (`openssl rand -hex 32`) y guardarla en la base de datos:

   ```sql
   insert into public.configurador_secreto (id, clave) values (1, '<la clave>')
   on conflict (id) do update set clave = excluded.clave;
   ```

3. Poner **la misma clave** en la variable de servidor `CONFIGURADOR_PRICING_SECRET`
   (`.env` en local y Vercel → Production y Preview).
4. Entrar en `/{ADMIN_PATH}/configurador` y rellenar los precios.

Sin la migración, la web sigue funcionando con el catálogo de respaldo del código.
Sin la clave, las solicitudes llegan igual, pero el email avisa de que no se han
podido leer los precios.

---

## Precios

Cada opción tiene un **precio interno** (sin IVA) y una **unidad**:

| Unidad | Cantidad por la que se multiplica |
|---|---|
| por día | Días facturables: 1 día, los días del periodo, la fecha elegida entre varias o el nº de paradas del Roadshow |
| fijo por proyecto | 1 |
| por persona | Personas del servicio (opciones de cocina) o asistentes totales (resto) |

Total = Rental Base × días + la suma de cada opción elegida según su unidad.
Si faltan los días o las personas («todavía no lo sé»), la línea sale como «por
definir» y el email avisa de que el total es un mínimo. Logística, desplazamiento
e instalación no se calculan: se valoran a mano.

**El cliente nunca ve estos precios.** Viven en `configurador_precios`, que por RLS
solo pueden leer los admins. El servidor los lee con `precios_configurador(clave)`,
una función que solo responde si recibe la clave de `configurador_secreto`, una
tabla que nadie puede leer desde fuera. Por eso no hace falta service role key.

Comprobación rápida: el código fuente de `/configurador` solo tiene que contener
`precioDesde` (el «Desde 450 €» público), nunca un precio de opción.

---

## Editor visual (`/{ADMIN_PATH}/configurador`)

- **Vista previa:** a la izquierda está el stepper real dentro de un iframe (`/{ADMIN_PATH}/vista`), en modo editor.
- **Editar:** al pulsar cualquier tarjeta, texto o imagen, se abre su formulario a la derecha.
- **Guardar:** los cambios se ven al momento en la vista previa, pero no se publican hasta pulsar «Guardar y publicar».

Todo es editable:

| Qué | Dónde se guarda |
|---|---|
| Opciones (nombre, descripción, foto, icono, etiquetas, aviso, orden, visibilidad, precio y unidad) | `configurador_opciones` + `configurador_precios` |
| Título y subtítulo de cada paso | `configurador_ajustes.pasos` |
| Textos fijos e imágenes fijas: avisos, botones, barra lateral, resumen, mensajes del calendario… (unas 260 claves) | `configurador_ajustes.textos` |
| Listas pequeñas: situaciones de fecha, alimentos, necesidades, capacidades, categorías, archivos de marca, pestañas de equipamiento | `configurador_ajustes.listas` |
| Precio «Desde», Rental Base, WhatsApp, texto «Incluye» | `configurador_ajustes` + `configurador_precios` |

- **Textos:** los valores por defecto viven en `src/data/configurador-textos.ts`. Si una clave no está guardada o está vacía, se usa la del código. En el panel, «Volver al texto original» la restaura.
- **Plantillas:** las palabras entre llaves (`{nombre}`, `{precio}`…) se sustituyen solas y no hay que borrarlas.
- **Listas fijas:** tienen ids de los que depende la lógica, así que solo se cambian los textos y se pueden ocultar elementos.
- **Listas libres:** necesidades y categorías de ambientación admiten añadir y quitar elementos.
- **Opciones ocultas:** en la vista previa se ven atenuadas con la etiqueta «Oculta»; en la web pública no aparecen.
- **«+ Añadir opción»:** está en cada grupo de la vista previa y crea la opción con su tipo y su padre ya puestos.
- **Lista completa:** `/{ADMIN_PATH}/configurador-lista` sigue disponible para editar opciones en bloque. No toca textos ni listas.

Cómo funciona por dentro:

- Cada cambio monta el catálogo borrador (sin precios) y lo envía por POST al iframe.
- `vista.astro` lo normaliza con `src/lib/configurador-borrador.ts` y lo pinta con el mismo `ConfiguradorApp` que la web pública.
- Los textos, las imágenes fijas y los títulos se aplican además al instante por `postMessage`, sin esperar a que se recargue. El protocolo está en `src/scripts/configurador/editor-puente.ts`.

---

## Envío

`POST /api/configurador` rehace el estado desde cero:

- Cruza cada id con el catálogo y descarta lo desconocido o desactivado.
- Limpia y recorta todos los textos.
- Exige los pasos completos, con las mismas reglas que el navegador.
- Revalida las fechas contra la disponibilidad.

Después calcula el desglose y manda el email con Resend a `LEAD_TO_EMAIL`:

- Asunto: `Solicitud FOODD-… — proyecto — fecha`.
- Cuerpo: tabla de precios y todas las respuestas.

Los códigos de error y las variables son los mismos que en `docs/leads.md`.

**Pendiente (fuera de alcance por ahora):**

- Guardar las solicitudes en Supabase y listarlas en el panel.
- Email de confirmación al cliente.
- Subida de archivos de marca y fotos del lugar.
- Cálculo automático de la ruta del Roadshow.

La referencia se genera al vuelo y no es única garantizada hasta que exista esa tabla.
