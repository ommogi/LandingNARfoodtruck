# Analítica: Google Analytics 4 vía Google Tag Manager

La web ya está instrumentada. `src/scripts/modal.ts` define `track()`, que empuja cada evento a
`window.dataLayer`, y hay más de treinta puntos de medición repartidos por las páginas. GTM lee
`dataLayer` de forma nativa, así que **no hay que tocar código para medir**: todo el trabajo que
queda es de configuración en los paneles de Google.

Este documento explica qué configurar y por qué.

---

## 1. Antes de empezar

1. Crea una propiedad de **Google Analytics 4** y anota su ID de medición (`G-XXXXXXXXXX`).
2. Crea un contenedor de **Google Tag Manager** para `narfoodtruck.com` y anota su ID
   (`GTM-XXXXXXX`).
3. Define la variable de entorno en el hosting:

   ```
   PUBLIC_GTM_ID=GTM-XXXXXXX
   ```

   En Vercel: *Settings → Environment Variables*, solo en Production. Déjala **sin definir en
   Preview y Development**, para que las pruebas no contaminen los datos.

Sin esa variable la web no carga ningún script de analítica. Es intencionado: permite desplegar y
probar sin medir nada.

---

## 2. Consentimiento: lo que ya está resuelto en el código

`src/layouts/BaseLayout.astro` emite, **antes** del snippet de GTM, un bloque de Consent Mode v2 con
todas las señales denegadas salvo `security_storage`. Cuando el usuario decide,
`src/scripts/consent.ts` emite un `consent update`.

Correspondencia entre las categorías del banner y las señales de Google:

| Categoría del banner | Señal de Consent Mode | Qué gobierna |
|---|---|---|
| Analítica | `analytics_storage` | GA4 |
| Mapa de Google | `functionality_storage` | El iframe de Maps en `/contacto` |

Las señales de publicidad (`ad_storage`, `ad_user_data`, `ad_personalization`) se quedan denegadas
siempre porque hoy no hay ninguna etiqueta de Google Ads.

> **Si algún día se añade Google Ads:** no basta con crear la etiqueta en GTM. Hay que añadir una
> categoría nueva al banner (`src/lib/consent.ts`), gestionar sus señales en `consent.ts` y
> documentar las cookies en `/cookies`. El consentimiento solo es válido si es informado.

**En GTM, cada etiqueta debe declarar sus comprobaciones de consentimiento adicionales.** En la
configuración de la etiqueta, *Consentimiento adicional obligatorio* → `analytics_storage`. Sin
esto, GTM dispararía las etiquetas ignorando la decisión del usuario y toda la implementación
legal quedaría en nada.

---

## 3. Configuración en GTM

### 3.1 Etiqueta base

- **Tipo:** Google Tag (GA4)
- **ID de medición:** `G-XXXXXXXXXX`
- **Activador:** Initialization - All Pages
- **Consentimiento adicional obligatorio:** `analytics_storage`

Esto ya da páginas vistas, sesiones y fuentes de tráfico.

### 3.2 Eventos personalizados

Para cada evento que quieras medir:

1. **Activador** → *Evento personalizado* → nombre exacto del evento (columna «Evento en
   dataLayer» de la tabla de abajo).
2. **Etiqueta** → *GA4 Event* → nombre del evento en GA4 y, si aplica, sus parámetros.
3. Marca las comprobaciones de consentimiento.

Para los parámetros, crea variables de capa de datos con el mismo nombre que la clave: `config`,
`filter`, `step`, `estado`, `type`, `length`, `origin`.

**Atajo recomendado:** en lugar de crear una etiqueta por evento, crea **una sola** etiqueta GA4
Event cuyo nombre sea la variable integrada `{{Event}}` y asóciala a un activador de expresión
regular que cubra los eventos que te interesan. Ahorra decenas de etiquetas y todos los eventos
llegan con su nombre correcto.

---

## 4. Inventario de eventos

### Embudo de conversión — lo que de verdad importa

| Evento en dataLayer | Parámetros | Cuándo se dispara | ¿Conversión? |
|---|---|---|---|
| `form_open` | — | Se abre el modal de presupuesto | |
| `form_start` | — | El usuario escribe en el primer campo | |
| `form_submit` | — | Pulsa enviar y pasa la validación | |
| `lead_success` | — | El servidor confirma la solicitud | **Sí** |
| `form_error` | `type` (`client` \| `server`) | Falla la validación o el envío | |
| `booking_open` | — | Se abre el asistente de reserva | |
| `booking_step` | `step` | Avanza de paso en el asistente | |
| `booking_date` | `estado` | Elige una fecha en el calendario | |
| `booking_config` | `config` | Elige configuración en el asistente | |
| `booking_whatsapp` | — | Termina la reserva por WhatsApp | **Sí** |

`lead_success` y `booking_whatsapp` son los dos únicos eventos que representan un lead real.
Márcalos como **eventos clave** en GA4 (*Administrar → Eventos clave*). Todo lo demás es contexto.

`form_error` con `type: server` merece una alerta: significa que se están perdiendo leads.

### Intención comercial

| Evento en dataLayer | Parámetros | Dónde |
|---|---|---|
| `cta_header_click` | — | Botón de reserva de la cabecera |
| `cta_hero_click` | — | CTA principal de la home |
| `cta_final_click` | — | CTA de cierre de la home |
| `cta_truck_hero` | — | Hero de `/el-truck` |
| `cta_servicios_hero` | — | Hero de `/servicios` |
| `cta_config_reservar` | — | `/configuraciones` |
| `cta_gallery_click` | — | `/galeria` |
| `cta_contact_hero_click` | — | Hero de `/contacto` |
| `cta_contact_form_submit` | — | Botón de envío de `/contacto` |
| `cta_contact_phone_click` | — | Clic en el teléfono |
| `cta_contact_location_click` | — | CTA junto al mapa |
| `cta_faq_support` | — | Bloque de ayuda de `/faq` |
| `cta_about_final` | — | Cierre de `/nosotros` |
| `cta_faq_final` | — | Cierre de `/faq` |
| `cta_servicios_final` | — | Cierre de `/servicios` |

### Interés en el producto

| Evento en dataLayer | Parámetros | Qué indica |
|---|---|---|
| `config_open` | `config` | Abre el detalle de una configuración |
| `config_open_<id>` | — | Variante desde las tarjetas (`config_open_base`, `_compact`, `_profesional`, `_max`) |
| `config_select` | `config` | Elige una configuración |
| `config_plan` | — | Consulta la distribución interior |
| `doc_download` | — | Descarga la ficha técnica. Señal de intención alta |
| `video_open` | — | Reproduce el vídeo |
| `truck_gallery_hero`, `truck_gallery_specs` | — | Salta a la galería desde `/el-truck` |
| `servicios_configuraciones_hero` | — | Salta a configuraciones desde `/servicios` |

### Navegación y contenido

| Evento en dataLayer | Parámetros | Qué indica |
|---|---|---|
| `gallery_open` | — | Entra en la galería desde la home |
| `gallery_filter` | `filter` | Filtra fotos |
| `gallery_load_more` | `filter` | Pide más fotos: la galería engancha |
| `lightbox_open` | varios | Amplía una foto |
| `faq_filter` | `filter` | Filtra preguntas |
| `faq_search` | `length` | Busca en las FAQ. **Solo se envía la longitud del texto, nunca lo escrito** |
| `faq_all_click` | — | Va a `/faq` desde `/el-truck` |
| `consent_update` | `origin`, `analytics`, `maps` | Decisión de cookies |

---

## 5. Qué mirar una vez haya datos

Las tres preguntas que este montaje responde y que deberían guiar las decisiones:

1. **¿De dónde vienen los leads?** Informe de adquisición cruzado con `lead_success`. Dice en qué
   canal merece la pena invertir.
2. **¿Dónde se cae la gente?** Embudo `form_start` → `form_submit` → `lead_success`. Una caída
   grande entre los dos primeros es un problema del formulario; entre los dos últimos, un problema
   del servidor.
3. **¿Qué configuración se mira más y cuál se contrata?** `config_open` frente a `config_select` y
   `booking_config`. Si la más vista no es la más elegida, el precio o la descripción no encajan.

---

## 6. Privacidad: reglas que no se saltan

- **`track()` nunca lleva datos personales.** `faq_search` envía la longitud del texto buscado, no el
  texto. Al añadir eventos nuevos, mantener esa regla: nada de nombres, emails, teléfonos ni
  contenido escrito por el usuario.
- En GA4, **desactiva las señales de Google** y la personalización de anuncios mientras no haya
  campañas: son un tratamiento distinto que hoy nadie ha consentido.
- Al añadir cualquier herramienta nueva, actualiza `/cookies` **antes** de activarla.

---

## 7. Complementos recomendados

- **Google Search Console.** Gratis, sin cookies y sin consentimiento. Es la única fuente de datos
  de posiciones y consultas reales de búsqueda, y complementa la auditoría SEO. Verifica el dominio
  y enlázalo con GA4.
- **Vercel Speed Insights.** Mide Core Web Vitals con usuarios reales, sin cookies. Cubre justo lo
  que la auditoría SEO no pudo medir.
