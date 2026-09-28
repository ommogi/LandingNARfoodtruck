# Analítica: Google Analytics 4

La web ya está instrumentada. `src/scripts/modal.ts` define `track()`, que empuja cada evento a
`window.dataLayer`, y hay más de treinta puntos de medición repartidos por las páginas.

**No se usa Google Tag Manager.** GA4 se carga directamente con `gtag.js`, y `src/scripts/consent.ts`
reenvía los eventos de `dataLayer` a GA4. La ventaja es que no hay ningún panel que configurar:
funciona en cuanto despliegas.

---

## 1. Antes de empezar

Solo hace falta una cosa: el ID de medición de la propiedad de **Google Analytics 4**
(`G-XXXXXXXXXX`), en una variable de entorno:

```
PUBLIC_GA4_ID=G-XXXXXXXXXX
```

En Vercel: *Settings → Environment Variables*, solo en **Production**. Déjala sin definir en Preview
y Development para que las pruebas no contaminen los datos.

Sin esa variable la web no carga ningún script de analítica.

---

## 2. Cómo funciona la carga

El orden importa y está resuelto en el código:

1. `src/layouts/BaseLayout.astro` emite, en la cabecera y de forma síncrona, un bloque de Consent
   Mode v2 con **todas las señales denegadas** salvo `security_storage`. Define `gtag()` y
   `dataLayer`, pero **no descarga nada de Google**.
2. Si el navegador ya guardaba una decisión, la restaura en ese mismo instante.
3. `src/scripts/consent.ts` descarga `gtag.js` **solo cuando hay consentimiento de analítica**.
   Quien rechaza no genera ni una petición a Google.
4. Al cargarlo, engancha el reenviador: los eventos de `track()` pasan a GA4 como eventos con sus
   parámetros.

Correspondencia entre las categorías del banner y las señales de Google:

| Categoría del banner | Señal de Consent Mode | Qué gobierna |
|---|---|---|
| Analítica | `analytics_storage` | GA4 |
| Mapa de Google | `functionality_storage` | El iframe de Maps en `/contacto` |

Las señales de publicidad (`ad_storage`, `ad_user_data`, `ad_personalization`) se quedan denegadas
siempre porque hoy no hay ninguna etiqueta de Google Ads.

> **Si algún día se añade Google Ads:** hay que añadir una categoría nueva al banner
> (`src/lib/consent.ts`), gestionar sus señales en `consent.ts` y documentar las cookies en
> `/cookies`. El consentimiento solo es válido si es informado.

### No pegues el snippet de Google en la cabecera

Google, al crear la propiedad, ofrece un fragmento «Google tag» para pegar en el `<head>`. **No lo
uses en este proyecto.** Hace tres cosas incompatibles con lo que hay montado:

- Carga `gtag.js` y llama a `gtag('config', ...)` de inmediato, saltándose el consentimiento y
  escribiendo cookies `_ga` antes de que el usuario decida.
- Duplicaría la medición con la carga que ya hace `consent.ts`.
- Como Astro procesa los `<script>` sin `is:inline` como módulos TypeScript, da errores de
  compilación (`Cannot find name 'dataLayer'`).

Todo lo que ese fragmento hace ya está cubierto por `PUBLIC_GA4_ID`.

---

## 3. Eventos: no hay nada que configurar

El reenviador de `src/scripts/consent.ts` convierte cada objeto `{event, ...params}` de `dataLayer`
en una llamada `gtag('event', nombre, params)`. Los eventos llegan a GA4 con su nombre tal cual y
sus parámetros como parámetros de evento.

Lo único que conviene hacer en el panel de GA4 es marcar como **eventos clave** los dos que
representan un lead real: `lead_success` y `booking_whatsapp`
(*Administrar → Eventos clave*).

Si quieres usar los parámetros (`config`, `filter`, `step`...) en informes, regístralos como
**dimensiones personalizadas** en *Administrar → Definiciones personalizadas*. Sin eso los recibe
igual, pero no puedes segmentar por ellos.

---

## 4. Inventario de eventos

### Embudo de conversión — lo que de verdad importa

| Evento en dataLayer | Parámetros | Cuándo se dispara | ¿Conversión? |
|---|---|---|---|
| `form_open` | — | Se abre el modal de presupuesto | |
| `form_start` | — | El foco entra por primera vez en un campo | |
| `form_submit` | — | Pulsa enviar y pasa la validación | |
| `lead_success` | — | El servidor confirma la solicitud | **Sí** |
| `form_error` | `type` (`client` \| `server`) | Falla la validación o el envío | |
| `booking_open` | — | Se abre el asistente de reserva | |
| `booking_step` | `step` | Avanza de paso en el asistente | |
| `booking_date` | `estado`, `total` | Marca o desmarca una fecha en el calendario. `total` son las que quedan elegidas | |
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
