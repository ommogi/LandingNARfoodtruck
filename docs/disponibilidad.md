# Disponibilidad y panel de gestión

El cliente marca desde el panel de gestión (URL secreta, ver [Acceso al panel](#acceso-al-panel)) qué días están ocupados y qué días tienen poca
disponibilidad. Los cambios se ven en la web **sin volver a desplegar**.

Antes esas fechas eran dos arrays escritos a mano en `src/data/disponibilidad.ts`
y cada cambio exigía un despliegue, así que en la práctica nunca se mantenían.

---

## Cómo funciona

```
Visitante  ──GET /api/disponibilidad──►  caché CDN 60 s  ──►  Supabase (lectura anónima)
           ──POST /api/presupuesto────►  lee Supabase directo y revalida las fechas
Cliente    ──/{ADMIN_PATH}──► middleware reescribe a /admin + comprueba sesión ──► POST /{ADMIN_PATH}/api/disponibilidad ──► Supabase (RLS)
```

El sitio sigue siendo estático (`output: 'static'`). Solo estas rutas declaran
`prerender = false`:

| Ruta | Qué hace |
|---|---|
| `src/pages/api/disponibilidad.ts` | JSON público con las fechas. Cacheado 60 s en el CDN. |
| `src/pages/api/presupuesto.ts` | Ya existía. Ahora revalida las fechas contra Supabase. |
| `src/pages/api/admin/disponibilidad.ts` | Escritura desde el panel. |
| `src/pages/admin/*` | Panel, login con contraseña, código de recuperación, cambio de contraseña y salida. Solo accesibles a través de `/{ADMIN_PATH}`. |

### Piezas

- **`src/data/disponibilidad.ts`** — lógica pura. Se empaqueta en el bundle del
  navegador, así que **no puede importar el SDK de Supabase ni leer secretos**.
  `estadoFecha(iso, dispo)` recibe los datos como parámetro; es el único punto
  donde se decide si una fecha está libre.
- **`src/lib/disponibilidad-server.ts`** — `getDisponibilidad()`, solo servidor.
  **Nunca lanza**: si Supabase falla devuelve los valores por defecto y lo
  registra. Un fallo de la base de datos no puede costar un lead.
- **`src/middleware.ts`** — crea el cliente de la petición, responde 404 a
  `/admin` y `/api/admin/*`, reescribe `/{ADMIN_PATH}/…` a esas rutas internas y
  corta el paso sin sesión de admin.
- **`src/scripts/admin.ts`** — el panel. Estado "guardado" vs. estado "en
  pantalla"; el botón Guardar manda solo la diferencia.

### La comprobación que de verdad importa

El calendario del visitante es una cortesía: se puede manipular desde el
navegador y su caché puede ir hasta 60 s por detrás. **La única comprobación que
cuenta es la de `src/pages/api/presupuesto.ts`**, que lee Supabase en el momento
del envío.

Se mantiene la asimetría de siempre: un día `ocupado` se rechaza siempre, pero la
antelación mínima solo se exige a los leads del asistente de reserva. Los
formularios simples llevan un `<input type="date">` libre, y ahí una petición
urgente es un lead legítimo, no un error.

### Varias fechas por solicitud

El asistente deja marcar **tantos días sueltos como haga falta**, consecutivos o
no: hay alquileres de fin de semana, de feria de tres días y peticiones con
fechas alternativas. Van todas en el mismo campo `date`, en ISO y separadas por
comas, y las parsea `parsearFechas()` de `src/data/disponibilidad.ts`.

El campo es uno solo a propósito: `src/scripts/lead.ts` arma el cuerpo con
`Object.fromEntries(new FormData(...))`, que se quedaría únicamente con el último
de varios `<input>` con el mismo `name`. Así los formularios simples de
`/contacto` y `QuoteFormModal` no se tocan: su fecha suelta es una lista de un
elemento.

Al revalidar, **basta con que una fecha no valga para rechazar el envío entero**,
y el mensaje dice cuáles. No se puede aceptar media solicitud sin decidir por
quien reserva cuál de sus días se queda fuera.

No hay tope de fechas en la interfaz. El techo real lo pone `MAX_BODY_BYTES`
(12 000 bytes) en `src/pages/api/presupuesto.ts`, que ya existía.

---

## Puesta en marcha (una sola vez)

### 1. Proyecto de Supabase

Crear el proyecto y aplicar `supabase/migrations/0001_disponibilidad.sql`.

### 2. Quién puede editar

El permiso no es «tener cuenta», es **estar en la tabla `admins`**. Lo comprueba
la función `es_admin()` de Postgres, y la usan tanto las políticas RLS como
`src/middleware.ts`, así que no hay dos listas que puedan desincronizarse.

```sql
insert into public.admins (email, nombre) values ('cliente@narfoodtruck.com', 'NAR');
```

Se hizo así a propósito. La alternativa habitual —dar escritura a cualquier
usuario `authenticated` y desactivar el registro público— depende de un
interruptor del dashboard que se puede olvidar, se puede reactivar sin querer y
no deja rastro en el código. Con la tabla, aunque el registro esté abierto, un
usuario nuevo no puede tocar nada.

Aun así, conviene cerrar el registro: **Authentication → Sign In / Providers →
Email**, desactivar *Allow new users to sign up*, e invitar al cliente desde
**Authentication → Users → Invite user**. Es una capa más, no la única.

Estar en `admins` **no crea la cuenta**: son dos cosas distintas. `admins` dice
quién puede editar; `auth.users` dice quién tiene cuenta. Hacen falta las dos.

Para crear la cuenta: **Authentication → Users → Add user → Create new user**,
con *Auto Confirm User* marcado. La contraseña que se ponga ahí da igual: en el
primer acceso el cliente usa «¿Olvidaste la contraseña o es tu primer acceso?»,
recibe un código y crea la suya.

### 2b. Código por correo (primer acceso y recuperación)

Se entra con **correo y contraseña** (`src/pages/admin/entrar.ts`). El código por
correo ya no es una forma de entrar: sirve para el primer acceso y para
recuperar la contraseña. Tras canjearlo, la cookie `nar-admin-clave` hace que el
middleware solo deje pasar a `/{ADMIN_PATH}/clave` hasta fijar una nueva.

Recomendado en **Authentication → Providers → Email**: *Minimum password length*
= 12 (el panel ya lo exige) y *Secure password change* activado.

No se usa magic link: se pide un código de 8 dígitos. El enlace se quitó
porque el flujo PKCE obliga a abrirlo en el mismo navegador y el mismo dominio
que lo pidió, y cualquier desvío —con o sin `www`, el correo abierto en el móvil,
un escáner de correo corporativo que lo visita antes que la persona— fallaba
siempre con el mismo mensaje engañoso: «el enlace ha caducado». El código no
depende de nada de eso, así que las *Redirect URLs* ya no intervienen en el
login.

Hay que configurar tres cosas:

1. **Authentication → Emails → plantilla *Magic Link***: incluir `{{ .Token }}`
   en el cuerpo. Es lo que renderiza el código. Sin esto el correo llega solo con
   un enlace que ya no lleva a ninguna parte.
2. **Authentication → Emails**: *Email OTP Expiration* = 900 (15 min) y
   *Email OTP Length*, que ahora mismo está en **8**.

   Ese número tiene que coincidir con `LARGO_CODIGO` de `src/data/acceso.ts`, de
   donde salen a la vez las casillas del formulario, la validación del navegador
   y la del servidor. Si se cambia en el dashboard y no aquí, el formulario
   rechaza códigos buenos antes de preguntarle a Supabase.
3. **Project Settings → Authentication → SMTP Settings**: activar *Custom SMTP*.
   El SMTP integrado de Supabase está limitado a **2 correos por hora y
   proyecto**, y al pasarse devuelve 429 sin avisar de forma clara. Se reutiliza
   Resend, que el proyecto ya tiene para los presupuestos:

   | Campo | Valor |
   |---|---|
   | Host | `smtp.resend.com` |
   | Puerto | `587` |
   | Usuario | `resend` |
   | Contraseña | el valor de `RESEND_API_KEY` |
   | Sender | el mismo dominio verificado de `LEAD_FROM_EMAIL` |

   Después, subir el límite en **Authentication → Rate Limits → Email**.

   **Ahora mismo no hay ningún dominio verificado en Resend** (ver `docs/leads.md`),
   así que en el campo *Sender email* va `onboarding@resend.dev`, el remitente
   sandbox que ya usan los presupuestos. Funciona sin tocar DNS, pero **solo
   entrega a la dirección dueña de la cuenta de Resend** (`mtr.omarmg@gmail.com`).
   Basta para el admin actual; en cuanto haya que dar acceso a otra persona hay
   que verificar el dominio y cambiar el *Sender* a una dirección propia.

*Site URL* (`https://www.narfoodtruck.com`) se deja puesta: la usan los correos
de recuperación e invitación.

### 3. Variables de entorno

En `.env` (local) y en Vercel (Production y Preview):

```
PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
PUBLIC_SUPABASE_ANON_KEY=<clave anon / publishable>
ADMIN_PATH=gestion-<aleatorio>
```

`ADMIN_PATH` es la URL secreta del panel. Ver [Acceso al panel](#acceso-al-panel).

La clave anon es pública por diseño, aunque desde el cambio a código de acceso ya
no viaja al navegador en `/admin/login`: las dos llamadas del login van a
endpoints propios. Lo que protege los datos son las políticas RLS. **El proyecto
no usa service role key a propósito**, para que una fuga de código no dé acceso
total.

Sin estas variables la web funciona igual, con el comportamiento por defecto
(nada bloqueado, 7 días de antelación, 12 meses visibles).

---

## Acceso al panel

El panel **no está en `/admin`** (esa ruta, y `/api/admin/*`, responden 404 a
propósito). Vive en `https://www.narfoodtruck.com/{ADMIN_PATH}`, donde
`ADMIN_PATH` es una variable de servidor que no está en el código ni en el
repositorio.

- Generarla: `echo "gestion-$(openssl rand -hex 6)"` → p. ej. `gestion-3f9c1a7b2e04`.
  Validación: 12-64 caracteres, minúsculas, números y guiones.
- Ponerla en `.env` y en Vercel (Production y Preview) y redesplegar. En local
  hay que **reiniciar `npm run dev`**: el `.env` solo se lee al arrancar.
- Sin la variable, o con un valor no válido, el panel queda **cerrado** (todo
  404) y el log avisa.
- Cambiarla es la forma de «mover» el panel si la URL se filtra: los marcadores
  antiguos dejan de funcionar al instante.

Cómo se oculta (`src/middleware.ts` + `src/pages/[...ruta].astro`):

- La ruta comodín hace que cualquier URL tenga ruta, para que el middleware
  llegue a ver la secreta. Por lo demás responde 404.
- `/{ADMIN_PATH}/x` se reescribe a `/admin/x` y `/{ADMIN_PATH}/api/x` a
  `/api/admin/x` sin cambiar la URL del navegador.
- Sin sesión de admin, las páginas llevan al login y **las APIs dan 404**, no 401.
- Las respuestas del panel llevan `Referrer-Policy: same-origin` (la URL no se
  filtra al seguir un enlace), `X-Robots-Tag: noindex`, `X-Frame-Options: DENY` y
  `Cache-Control: private, no-store`.
- No aparece en `robots.txt` ni en el sitemap: listarla la delataría.

Esconder la URL es una capa extra, no la seguridad. Lo que protege de verdad es:

- la contraseña, con límite de 5 intentos cada 15 min por IP y por correo, y
  respuesta de duración fija
- la tabla `admins` con `es_admin()`
- las políticas RLS

## Para el cliente

1. Entrar en la URL del panel (guárdala en marcadores), con correo y contraseña.
   La primera vez, o si se olvida la contraseña, pulsar «¿Olvidaste la
   contraseña o es tu primer acceso?», teclear el código que llega por email y
   crear una contraseña nueva (mínimo 12 caracteres). Se puede cambiar cuando se
   quiera desde la pestaña **Cuenta**.
2. **Un clic en un día lo cambia**: libre → ocupado → poca disponibilidad →
   libre otra vez.
3. **Bloquear un periodo** marca todos los días de un rango de una vez
   (vacaciones, taller). Después se pueden ajustar días sueltos.
4. **Nada se guarda hasta pulsar «Guardar cambios».** Los días con un punto azul
   son los que están pendientes de guardar.
5. Los cambios tardan hasta un minuto en verse en la web (caché).
6. Quien reserva **puede marcar varios días**. Cuando lo hace, el correo llega
   con la fila «Fechas (N)» y todas listadas, y el asunto lleva la primera con
   un «+N días» detrás.

### Ajustes

- **Antelación mínima**: días que tienen que pasar entre hoy y el evento. Nadie
  podrá elegir una fecha más cercana.
- **Meses visibles**: hasta dónde puede navegar el visitante hacia delante. El
  panel siempre deja navegar más lejos, para poder cerrar fechas futuras.

---

## Si el login no funciona

El login responde siempre «Correo o contraseña incorrectos», y la petición de
código siempre «si ese correo tiene acceso, te acaba de llegar un código», haya
cuenta o no. Es deliberado: decir «ese usuario no
existe» le confirmaría a un curioso qué emails abren el panel. El precio es que
durante la puesta en marcha esconde el motivo real, así que hay que mirar los
logs del servidor (`npm run dev` en local, *Logs* de la función en Vercel), donde
`entrar`, `codigo` y `verificar` sí escriben el error completo.

| Lo que se ve | Qué pasa |
|---|---|
| «Se ha alcanzado el límite de correos de esta hora» | `over_email_send_rate_limit`: tope del proyecto. Con el SMTP integrado son 2 correos/hora. Se arregla configurando *Custom SMTP* (paso 2b); si no, hay que esperar. |
| «Acabas de pedir un código. Espera un minuto» | Cooldown de ~60 s entre peticiones del mismo email. No tiene que ver con el SMTP. |
| El correo llega con enlace pero sin código | Falta `{{ .Token }}` en la plantilla *Magic Link* (paso 2b). |
| No llega nada y en los logs no hay error | No existe la cuenta en `auth.users`. Crearla (paso 2). |
| «Código incorrecto o caducado» con el código recién llegado | Se pidió más de un código: solo vale el último. |
| Todo da 404, también la URL del panel | Falta `ADMIN_PATH`, no es válida o el servidor no se reinició tras añadirla. |
| «Correo o contraseña incorrectos» con la contraseña buena | La cuenta existe pero el email no está en `public.admins`, o aún no se ha creado contraseña (usar el código). |
| «Demasiados intentos» | 5 fallos en 15 min desde esa IP o para ese correo. Esperar. |
| El panel abre y Guardar da error | El email está en `admins` con otra grafía. La comparación ignora mayúsculas, no espacios. |

**Para desbloquearse si el límite de correos está agotado**: configurar el
*Custom SMTP* del paso 2b, que es lo que quita el tope, o esperar a que pase la
hora. El *Send magic link* del dashboard **ya no sirve**: ese enlace apunta a un
callback que se eliminó y no lleva a ninguna parte.

## Cómo se ve «poca disponibilidad»

Un día marcado como `poca` sigue siendo seleccionable, pero avisa en tres sitios,
a propósito redundantes porque cada uno falla en un caso distinto:

1. **La celda del calendario**: fondo rust al 14% con un aro interior. El aro
   importa: en móvil (≤620 px) el rótulo de texto se oculta para que las siete
   columnas quepan, y sin él el estado se perdía. Estaba al 7% —indistinguible
   de un día libre sobre blanco— mientras la leyenda enseñaba un punto rust
   sólido; la leyenda prometía un color que la celda no tenía.
2. **Aviso al elegirlo**, bajo el calendario del paso 1, en tono neutro. Con
   varias fechas marcadas dice cuántas van justas.
3. **Coletilla «· Poca disponibilidad»** pegada a la fecha, que viaja por los
   cuatro pasos hasta el resumen final. El aviso del punto 2 lo borra
   `goToStep()` al avanzar, y el resumen es donde se confirma: si el dato se
   pierde por el camino, quien reserva un día justo se entera por correo y ya es
   tarde. Con varias fechas la coletilla va **por fecha** y no agregada: hay que
   saber cuál de ellas es la que va justa.

## Si un cambio del panel no se ve en la web

Por orden de probabilidad:

1. **El día está dentro de la antelación mínima.** `estadoFecha()` comprueba el
   plazo **antes** que el estado, así que un día a menos de N días de hoy sale
   como «fuera de plazo» esté marcado o no. Marcarlo no cambia nada de lo que ve
   el visitante. El panel lo raya en diagonal y lo avisa bajo el calendario, y
   la marca se guarda igual por si algún día se baja la antelación.
2. **La caché de 60 s.** El endpoint se cachea en el CDN. Esperar un minuto.
3. **No se ha reabierto el asistente.** `src/scripts/booking.ts` pide la
   disponibilidad al abrir el modal y la guarda en memoria para el resto de la
   visita. Recargar la página.

## Pendiente

El calendario **sigue sin decir «disponible»**: `ESTADO_ETIQUETA.disponible`
está vacío y la leyenda de `src/components/booking/BookingCalendar.astro` solo
muestra «Poca disponibilidad» y «No disponible».

Era la decisión correcta cuando el dato no se mantenía. Ahora que el cliente
puede mantenerlo, conviene revisarla — pero solo cuando lleve unas semanas
usando el panel de verdad. Prometer disponibilidad y luego desdecirse por correo
es peor que no prometer nada.
