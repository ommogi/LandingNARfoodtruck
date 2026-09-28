# Envío de solicitudes de presupuesto

Los tres formularios de la web —el asistente de reserva, `QuoteFormModal` y el de
`/contacto`— envían a `src/pages/api/presupuesto.ts`, que manda un correo con
Resend.

**No hay tabla de reservas: el correo es el único destino del lead.** Si el envío
falla, lo único que queda es el log del servidor. De ahí que este documento
exista: un fallo de configuración aquí se traduce directamente en leads perdidos.

---

## Variables

En `.env` (local) y en Vercel (Production y Preview):

| Variable | Qué es |
|---|---|
| `RESEND_API_KEY` | Clave de https://resend.com/api-keys |
| `LEAD_FROM_EMAIL` | Remitente. **Tiene que estar en un dominio verificado en Resend** |
| `LEAD_TO_EMAIL` | Buzón comercial que recibe las solicitudes |

Si falta cualquiera de las tres, la ruta responde **503** y no intenta enviar. El
lead queda entero en el log (`[presupuesto] Falta configuracion de email`).

---

## Qué significa cada código

Es lo primero que hay que mirar cuando un envío falla:

| Código | Qué significa |
|---|---|
| **503** | Falta alguna de las tres variables |
| **502** | Resend rechaza el envío. Casi siempre: el dominio del `from` no está verificado, o en sandbox el destinatario no es el dueño de la cuenta |
| **422** | Falta un campo obligatorio, o alguna fecha ya no está disponible |
| **429** | Límite de 5 envíos por minuto y por IP |
| **413** | Cuerpo de más de 12 000 bytes |

Un **502** no dice nada útil en el navegador a propósito: el fallo es nuestro, no
de quien reserva. El motivo real está en el log del servidor, junto al lead
completo:

```
[presupuesto] Envio fallido. Lead sin enviar: { motivo: '...', lead: {...} }
```

En Vercel, **Logs** → buscar `Envio fallido`. En local, la terminal donde corre
`npm run dev`.

> **Aviso de privacidad.** Ese log contiene datos personales: nombre, email,
> teléfono y el mensaje libre. Es deliberado —sin él el lead se perdería del
> todo— pero significa que los logs del proyecto tienen datos de clientes y los ve
> quien tenga acceso al proyecto en Vercel.

---

## Comprobar el estado sin enviar nada

```bash
set -a; . ./.env; set +a
curl -s -H "Authorization: Bearer $RESEND_API_KEY" https://api.resend.com/domains
```

- `{"object":"list","data":[]}` → **no hay ningún dominio verificado**. Cualquier
  `LEAD_FROM_EMAIL` con dominio propio dará 502.
- Un 401 significa que la clave no vale.

---

## Sandbox vs. dominio verificado

**Sandbox** (`LEAD_FROM_EMAIL=onboarding@resend.dev`) sirve para probar en local
sin esperar al DNS, con dos limitaciones:

1. Solo entrega **al correo dueño de la cuenta de Resend**. A cualquier otro
   destinatario responde 403, que la web convierte en 502.
2. El remitente no es el del cliente, así que **no vale para producción**.

**Dominio verificado** es lo que hace falta para producción:

1. Resend → **Domains → Add Domain** → `narfoodtruck.com`.
2. Copiar los registros que dé (TXT de DKIM, TXT de SPF, MX de feedback) al DNS
   del dominio.
3. Esperar a que Resend lo marque como *Verified*.
4. En Vercel: `LEAD_FROM_EMAIL=web@narfoodtruck.com` y `LEAD_TO_EMAIL` con el
   buzón real del cliente.

> **Estado actual: el dominio no está dado de alta.** En local se usa el
> remitente de sandbox. **Producción no envía** hasta completar los cuatro pasos
> de arriba.

Esto afecta también al login de `/admin`, que reutiliza la misma cuenta de Resend
como SMTP: ver `docs/disponibilidad.md`.

---

## Qué lleva el correo

Una tabla con nombre, contacto, tipo de evento, configuración, fechas, ubicación,
invitados, mensaje y origen. El `replyTo` es el email de quien reserva, así que se
le responde contestando al correo.

El asunto cambia según el formulario:

| Origen | Asunto |
|---|---|
| Asistente, una fecha | `Reserva Base — Boda — 28/06/2026` |
| Asistente, varias | `Reserva Base — Boda — 28/06/2026 +2 días` |
| Asistente, sin fecha | `Reserva Base — Boda — Fecha por definir` |
| Formulario simple | `Solicitud de presupuesto — Boda` |

El asistente permite elegir varios días; la fila de la tabla pasa a
`Fechas (3)`. Ver `docs/disponibilidad.md`.
