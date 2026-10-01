/** input type=time → lista de horas cada `step` (por defecto 15 minutos). */

import { ICONOS } from './base';
import { crearLista, type Opcion } from './lista';

const aMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h! * 60 + m! : NaN;
};
const aHora = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export const mejorarHora = (el: HTMLInputElement) => {
  const opciones = (): Opcion[] => {
    const paso = Math.max(5, Math.round((Number(el.step) || 900) / 60));
    const min = aMinutos(el.min);
    const max = aMinutos(el.max);
    const lista: Opcion[] = [];
    for (let m = 0; m < 24 * 60; m += paso) {
      if ((Number.isFinite(min) && m < min) || (Number.isFinite(max) && m > max)) continue;
      lista.push({ valor: aHora(m), texto: aHora(m) });
    }
    // Una hora escrita antes (o por codigo) que no cae en la rejilla se respeta.
    if (el.value && !lista.some((o) => o.valor === el.value)) {
      lista.push({ valor: el.value, texto: el.value });
      lista.sort((a, b) => a.valor.localeCompare(b.valor));
    }
    return lista;
  };
  const sugerida = () => {
    const ahora = new Date();
    const paso = Math.max(5, Math.round((Number(el.step) || 900) / 60));
    return aHora(Math.ceil((ahora.getHours() * 60 + ahora.getMinutes()) / paso) * paso % (24 * 60));
  };
  crearLista({ el, opciones, vacio: () => '--:--', icono: ICONOS.reloj, sugerida });
};
