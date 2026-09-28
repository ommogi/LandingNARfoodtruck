/**
 * Borrador del editor visual. SOLO SERVIDOR.
 *
 * El panel manda a la vista previa el catalogo tal y como esta en pantalla,
 * sin guardar. Aqui se reduce a la forma de un Catalogo antes de renderizarlo:
 * tipos correctos, longitudes acotadas e imagenes solo con rutas propias o
 * https. No se guarda nada: si algo no encaja, se usa el valor del catalogo
 * guardado.
 */

import {
  TIPOS_OPCION,
  TEXTOS_PASO_RESPALDO,
  type Catalogo,
  type Opcion,
  type PasoId,
  type TipoOpcion,
} from '../data/configurador';
import { esClaveTexto, esNombreLista, type ItemLista } from '../data/configurador-textos';

type Crudo = Record<string, unknown>;
const obj = (v: unknown): Crudo => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Crudo) : {});
const str = (v: unknown, max: number) => String(v ?? '').replace(/<[^>]*>/g, '').slice(0, max);
const strs = (v: unknown, maxItems = 40, max = 60) =>
  (Array.isArray(v) ? v : []).slice(0, maxItems).map((x) => str(x, max)).filter(Boolean);

const imagenSegura = (v: unknown): string | null => {
  const s = str(v, 500).trim();
  if (!s) return null;
  if (s.startsWith('/') && !s.startsWith('//')) return s;
  try {
    return new URL(s).protocol === 'https:' ? s : null;
  } catch {
    return null;
  }
};

const aOpcion = (raw: unknown): Opcion | null => {
  const o = obj(raw);
  const id = str(o.id, 60);
  const tipo = str(o.tipo, 30) as TipoOpcion;
  if (!/^[a-z0-9_]+(\.[a-z0-9_]+)*$/.test(id) || !TIPOS_OPCION.includes(tipo)) return null;
  return {
    id,
    tipo,
    padre: o.padre ? str(o.padre, 60) : null,
    nombre: str(o.nombre, 80) || id,
    descripcion: str(o.descripcion, 400),
    imagen: imagenSegura(o.imagen),
    icono: o.icono ? str(o.icono, 40) : null,
    etiquetas: strs(o.etiquetas, 12, 40),
    categoria: o.categoria ? str(o.categoria, 30) : null,
    incluido: o.incluido === true,
    recomendado_para: strs(o.recomendado_para, 60),
    visible_para: strs(o.visible_para, 30),
    mostrar_cocina: o.mostrar_cocina === true,
    a_medida: o.a_medida === true,
    aviso: o.aviso ? str(o.aviso, 60) : null,
    orden: Math.round(Number(o.orden) || 0),
    activo: o.activo !== false,
  };
};

export const catalogoDesdeBorrador = (raw: unknown, guardado: Catalogo): Catalogo => {
  const b = obj(raw);
  const a = obj(b.ajustes);

  const opciones = (Array.isArray(b.opciones) ? b.opciones : [])
    .slice(0, 600)
    .map(aOpcion)
    .filter((o): o is Opcion => Boolean(o));

  const pasos = { ...guardado.ajustes.pasos };
  for (const [id, v] of Object.entries(obj(a.pasos))) {
    if (!(id in TEXTOS_PASO_RESPALDO)) continue;
    const p = obj(v);
    pasos[id as PasoId] = {
      titulo: str(p.titulo, 120).trim() || TEXTOS_PASO_RESPALDO[id as PasoId].titulo,
      subtitulo: str(p.subtitulo, 300).trim() || TEXTOS_PASO_RESPALDO[id as PasoId].subtitulo,
    };
  }

  const textos: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj(a.textos))) {
    if (esClaveTexto(k) && typeof v === 'string' && v.trim()) {
      textos[k] = k.startsWith('img.') ? imagenSegura(v) ?? '' : str(v, 500);
    }
  }

  const listas: Catalogo['ajustes']['listas'] = {};
  for (const [k, v] of Object.entries(obj(a.listas))) {
    if (!esNombreLista(k) || !Array.isArray(v)) continue;
    listas[k] = v.slice(0, 40).map((x): ItemLista => {
      const i = obj(x);
      return {
        id: str(i.id, 40),
        nombre: str(i.nombre, 80),
        ...(i.descripcion ? { descripcion: str(i.descripcion, 300) } : {}),
        ...(i.icono ? { icono: str(i.icono, 40) } : {}),
        ...(i.oculto === true ? { oculto: true } : {}),
      };
    });
  }

  const precioDesde = Number(a.precioDesde);
  return {
    opciones: opciones.length ? opciones : guardado.opciones,
    ajustes: {
      precioDesde: Number.isFinite(precioDesde) && precioDesde >= 0 ? precioDesde : guardado.ajustes.precioDesde,
      textoIncluye: str(a.textoIncluye, 400) || guardado.ajustes.textoIncluye,
      whatsapp: str(a.whatsapp, 15).replace(/\D/g, ''),
      pasos,
      textos,
      listas,
    },
    editor: true,
  };
};
