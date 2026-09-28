/**
 * Utilidades comunes de los endpoints que reciben leads: /api/presupuesto
 * (formularios simples) y /api/configurador (configurador de 10 pasos).
 * SOLO SERVIDOR.
 */

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });

/** Texto plano, sin etiquetas, recortado. Todo lo que llega del navegador pasa por aqui. */
export const clean = (value: unknown, max = 500) =>
  String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, max);

/*
 * Colapsa a una sola linea lo que acaba en el asunto del correo: un valor
 * multilinea dejaria el asunto partido en la bandeja de entrada.
 */
export const oneLine = (value: string) => value.replace(/\s+/g, ' ').trim();

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[char] as string;
  });

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Limite por IP en memoria. Suficiente para un unico proceso; si la web se
 * despliega con varias instancias, sustituir por Redis o el limitador del CDN.
 * Cada endpoint crea el suyo para que no se consuman el cupo entre ellos.
 */
export const crearLimitador = (ventanaMs = 60_000, max = 5) => {
  const hits = new Map<string, number[]>();
  return (ip: string) => {
    const now = Date.now();
    const recent = (hits.get(ip) ?? []).filter((t) => now - t < ventanaMs);
    recent.push(now);
    hits.set(ip, recent);
    return recent.length > max;
  };
};
