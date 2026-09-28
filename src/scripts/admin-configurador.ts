/**
 * Catalogo del configurador en el panel: lo usan el editor visual
 * (/{ADMIN_PATH}/configurador, que ademas carga admin-editor.ts) y la lista
 * completa (/{ADMIN_PATH}/configurador-lista).
 *
 * Mismo modelo que el panel de disponibilidad: lo de pantalla no se guarda
 * hasta pulsar Guardar, y solo viajan las opciones tocadas. Cada fila
 * (<details data-opcion>) se marca como sucia al editarla; los campos se leen
 * por su atributo data-campo, asi este script no depende del marcado.
 */

import { validarImagen } from '../data/imagenes';
import { rutaPanel } from './admin-rutas';

const status = document.querySelector<HTMLElement>('[data-save-status]');
const guardarButton = document.querySelector<HTMLButtonElement>('[data-guardar]');
const descartarButton = document.querySelector<HTMLButtonElement>('[data-descartar]');
const ajustesSection = document.querySelector<HTMLElement>('[data-ajustes]');

const ID_RE = /^[a-z0-9_]+(\.[a-z0-9_]+)*$/;
/* Los padres se guardan antes que sus hijas: la clave foranea lo exige. */
const ORDEN_TIPOS = ['proyecto', 'uso', 'subtipo', 'subconfig'];

let ajustesSucios = false;
const borradas = new Set<string>();

const setStatus = (message: string, state: 'error' | 'success' | '' = '') => {
  if (!status) return;
  status.textContent = message;
  status.classList.toggle('is-error', state === 'error');
  status.classList.toggle('is-success', state === 'success');
};

const filasSucias = () => [...document.querySelectorAll<HTMLElement>('[data-opcion][data-sucio]')];

const hayCambios = () => ajustesSucios || borradas.size > 0 || filasSucias().length > 0;

const refrescarBarra = () => {
  const cambios = hayCambios();
  if (guardarButton) guardarButton.disabled = !cambios;
  if (descartarButton) descartarButton.disabled = !cambios;
  if (!cambios) return;
  const n = filasSucias().length + borradas.size;
  setStatus(
    `${n ? `${n} ${n === 1 ? 'opción modificada' : 'opciones modificadas'}` : 'Ajustes modificados'}. Pendientes de guardar.`,
  );
};

/* --------------------------------------------------- Lectura de una fila */

type Campo = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export const campo = (fila: HTMLElement, nombre: string) =>
  fila.querySelector<Campo>(`[data-campo="${nombre}"]`);

export const valor = (fila: HTMLElement, nombre: string) => campo(fila, nombre)?.value.trim() ?? '';

const marcado = (fila: HTMLElement, nombre: string) =>
  (campo(fila, nombre) as HTMLInputElement | null)?.checked ?? false;

const lista = (fila: HTMLElement, nombre: string) => [
  ...fila.querySelectorAll<HTMLInputElement>(`[data-campo-lista="${nombre}"] input:checked`),
].map((el) => el.value);

export const leerFila = (fila: HTMLElement) => {
  const tipo = fila.dataset.tipo as string;
  return {
    id: valor(fila, 'id'),
    tipo,
    padre: valor(fila, 'padre') || null,
    nombre: valor(fila, 'nombre'),
    descripcion: valor(fila, 'descripcion'),
    imagen: valor(fila, 'imagen') || null,
    icono: valor(fila, 'icono') || null,
    etiquetas: valor(fila, 'etiquetas')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    categoria: tipo === 'equipo' ? valor(fila, 'categoria') || null : null,
    incluido: marcado(fila, 'incluido'),
    recomendado_para: lista(fila, 'recomendado_para'),
    visible_para: lista(fila, 'visible_para'),
    mostrar_cocina: marcado(fila, 'mostrar_cocina'),
    a_medida: marcado(fila, 'a_medida'),
    aviso: valor(fila, 'aviso') || null,
    orden: Number(valor(fila, 'orden')) || 0,
    activo: marcado(fila, 'activo'),
    precio: Number(valor(fila, 'precio')) || 0,
    unidad: valor(fila, 'unidad'),
  };
};

/* --------------------------------------------------- Marcas y resumen */

const refrescarResumen = (fila: HTMLElement) => {
  const nombre = fila.querySelector<HTMLElement>('[data-resumen-nombre]');
  if (nombre) nombre.textContent = valor(fila, 'nombre') || 'Nueva opción';
  const id = fila.querySelector<HTMLElement>('[data-resumen-id]');
  if (id) id.textContent = valor(fila, 'id') || '—';
  const precio = fila.querySelector<HTMLElement>('[data-resumen-precio]');
  const unidad = campo(fila, 'unidad') as HTMLSelectElement | null;
  if (precio) {
    precio.textContent = `${Number(valor(fila, 'precio')) || 0} € ${unidad?.selectedOptions[0]?.textContent ?? ''}`;
  }
  const inactiva = fila.querySelector<HTMLElement>('[data-resumen-inactiva]');
  if (inactiva) inactiva.hidden = marcado(fila, 'activo');

  const src = valor(fila, 'imagen');
  fila.querySelectorAll<HTMLImageElement>('[data-vista], [data-vista-mini]').forEach((img) => {
    img.hidden = !src;
    if (src) img.src = src;
  });
};

/** Aviso para el editor visual: algo ha cambiado y la vista previa debe enterarse. */
const avisarCambio = (origen: HTMLElement | null) =>
  document.dispatchEvent(new CustomEvent('ed:cambio', { detail: { origen } }));

export const marcarSucia = (fila: HTMLElement) => {
  fila.dataset.sucio = '';
  const punto = fila.querySelector<HTMLElement>('[data-marca-sucio]');
  if (punto) punto.hidden = false;
  refrescarResumen(fila);
  refrescarBarra();
  avisarCambio(fila);
};

/** Marca los ajustes (textos, listas, pasos, generales) como pendientes de guardar. */
export const marcarAjustes = (origen: HTMLElement | null = null) => {
  ajustesSucios = true;
  refrescarBarra();
  avisarCambio(origen);
};

document.addEventListener('input', (event) => {
  const target = event.target as HTMLElement;
  if (target.matches('[data-subir]')) return;
  const fila = target.closest<HTMLElement>('[data-opcion]');
  if (fila) {
    marcarSucia(fila);
    return;
  }
  if (ajustesSection?.contains(target) && !target.matches('[data-ed-local]')) marcarAjustes(target);
});

/* change cubre checkboxes y selects en todos los navegadores. */
document.addEventListener('change', (event) => {
  const target = event.target as HTMLElement;
  if (target.matches('[data-subir]')) return;
  const fila = target.closest<HTMLElement>('[data-opcion]');
  if (fila) marcarSucia(fila);
});

/* --------------------------------------------------- Anadir y borrar */

document.querySelectorAll<HTMLButtonElement>('[data-anadir]').forEach((boton) => {
  boton.addEventListener('click', () => {
    const tipo = boton.dataset.anadir as string;
    const plantilla = document.querySelector<HTMLTemplateElement>(`[data-plantilla="${tipo}"]`);
    const destino = document.querySelector<HTMLElement>(`[data-lista="${tipo}"]`);
    if (!plantilla || !destino) return;

    const copia = plantilla.content.firstElementChild?.cloneNode(true) as HTMLElement | undefined;
    if (!copia) return;
    destino.append(copia);
    marcarSucia(copia);
    campo(copia, 'id')?.focus();
  });
});

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;

  const borrar = target.closest<HTMLButtonElement>('[data-borrar]');
  if (borrar) {
    const fila = borrar.closest<HTMLElement>('[data-opcion]');
    if (!fila) return;
    const nombre = valor(fila, 'nombre') || 'esta opción';
    const hijas = fila.dataset.tipo === 'proyecto' || fila.dataset.tipo === 'uso';
    const aviso = hijas ? ' También se borrarán las opciones que dependen de ella.' : '';
    if (!window.confirm(`¿Borrar «${nombre}»?${aviso} Se aplicará al pulsar «Guardar cambios».`)) return;
    if (!('nueva' in fila.dataset) && fila.dataset.id) borradas.add(fila.dataset.id);
    fila.remove();
    refrescarBarra();
    avisarCambio(null);
    return;
  }

  const quitar = target.closest<HTMLButtonElement>('[data-quitar-imagen]');
  if (quitar) {
    const fila = quitar.closest<HTMLElement>('[data-opcion]');
    const input = fila && campo(fila, 'imagen');
    if (fila && input) {
      input.value = '';
      marcarSucia(fila);
    }
  }
});

/* --------------------------------------------------- Subida de imagenes */

document.addEventListener('change', async (event) => {
  const input = event.target as HTMLInputElement;
  if (!input.matches('[data-subir]') || !input.files?.[0]) return;

  const fila = input.closest<HTMLElement>('[data-opcion]');
  if (!fila) return;
  const estado = fila.querySelector<HTMLElement>('[data-estado-subida]');
  const archivo = input.files[0];

  const motivo = validarImagen(archivo);
  if (motivo) {
    if (estado) estado.textContent = motivo;
    input.value = '';
    return;
  }

  if (estado) estado.textContent = 'Subiendo…';
  const datos = new FormData();
  datos.append('archivo', archivo);
  datos.append('id', valor(fila, 'id') || 'opcion');

  try {
    const response = await fetch(rutaPanel('/api/configurador-imagen'), { method: 'POST', body: datos });
    const data = (await response.json().catch(() => ({}))) as { ok?: boolean; url?: string; message?: string };
    if (!response.ok || !data.ok || !data.url) {
      if (estado) estado.textContent = data.message ?? 'No se pudo subir la imagen.';
      return;
    }
    const campoImagen = campo(fila, 'imagen');
    if (campoImagen) campoImagen.value = data.url;
    if (estado) estado.textContent = 'Imagen subida. Guarda los cambios para aplicarla.';
    marcarSucia(fila);
  } catch {
    if (estado) estado.textContent = 'No hay conexión. Inténtalo de nuevo.';
  } finally {
    input.value = '';
  }
});

/* --------------------------------------------------- Guardar */

export const leerAjustes = () => {
  const get = (nombre: string) =>
    ajustesSection?.querySelector<Campo>(`[data-ajuste="${nombre}"]`)?.value.trim() ?? '';
  const pasos: Record<string, { titulo: string; subtitulo: string }> = {};
  ajustesSection?.querySelectorAll<HTMLInputElement>('[data-paso]').forEach((el) => {
    const id = el.dataset.paso as string;
    if (!el.dataset.pasoCampo) return;
    pasos[id] ??= { titulo: '', subtitulo: '' };
    pasos[id][el.dataset.pasoCampo as 'titulo' | 'subtitulo'] = el.value.trim();
  });
  /*
   * Textos y listas solo existen en el editor visual. Si la pagina no los
   * tiene (lista completa), no se mandan y el servidor no los toca.
   */
  const camposTexto = [...(ajustesSection?.querySelectorAll<Campo>('[data-texto]') ?? [])];
  const textos = camposTexto.length
    ? Object.fromEntries(
        camposTexto
          .filter((c) => c.value.trim() && c.value !== c.dataset.defecto)
          .map((c) => [c.dataset.texto as string, c.value]),
      )
    : undefined;

  const bloquesLista = [...(ajustesSection?.querySelectorAll<HTMLElement>('[data-ed-lista]') ?? [])];
  const listas = bloquesLista.length
    ? Object.fromEntries(
        bloquesLista.map((bloque) => [
          bloque.dataset.edLista as string,
          [...bloque.querySelectorAll<HTMLElement>('[data-ed-item]')].map((item) => {
            const leer = (n: string) => item.querySelector<Campo>(`[data-item-campo="${n}"]`);
            return {
              id: leer('id')?.value.trim() ?? '',
              nombre: leer('nombre')?.value.trim() ?? '',
              descripcion: leer('descripcion')?.value.trim() || undefined,
              icono: leer('icono')?.value || undefined,
              oculto: (leer('oculto') as HTMLInputElement | null)?.checked || undefined,
            };
          }),
        ]),
      )
    : undefined;

  return {
    precioDesde: Number(get('precioDesde')) || 0,
    rentalPrecio: Number(get('rentalPrecio')) || 0,
    whatsapp: get('whatsapp').replace(/\D/g, ''),
    textoIncluye: get('textoIncluye'),
    pasos,
    textos,
    listas,
  };
};

/** Errores que el servidor tambien rechazaria, pero mejor decirlos aqui y en su fila. */
const validar = (filas: HTMLElement[]) => {
  const todos = [...document.querySelectorAll<HTMLElement>('[data-opcion]')].map((f) => valor(f, 'id'));
  for (const fila of filas) {
    const o = leerFila(fila);
    let error = '';
    if (!ID_RE.test(o.id)) error = 'El identificador solo admite minúsculas, números, «_» y «.».';
    else if (todos.filter((id) => id === o.id).length > 1) error = `El identificador «${o.id}» está repetido.`;
    else if (!o.nombre) error = 'Falta el nombre.';
    else if ((o.tipo === 'subtipo' || o.tipo === 'subconfig') && !o.padre) error = 'Falta elegir a qué pertenece.';
    if (error) {
      (fila as HTMLDetailsElement).open = true;
      fila.scrollIntoView({ block: 'center' });
      return `«${o.nombre || o.id || 'Nueva opción'}»: ${error}`;
    }
  }
  return '';
};

descartarButton?.addEventListener('click', () => {
  if (window.confirm('¿Descartar todos los cambios sin guardar?')) {
    ajustesSucios = false;
    borradas.clear();
    document.querySelectorAll<HTMLElement>('[data-opcion][data-sucio]').forEach((f) => delete f.dataset.sucio);
    window.location.reload();
  }
});

guardarButton?.addEventListener('click', async () => {
  const filas = filasSucias();
  const error = validar(filas);
  if (error) {
    setStatus(error, 'error');
    return;
  }

  const opciones = filas
    .map(leerFila)
    .sort((a, b) => {
      const ia = ORDEN_TIPOS.indexOf(a.tipo);
      const ib = ORDEN_TIPOS.indexOf(b.tipo);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });

  guardarButton.disabled = true;
  setStatus('Guardando…');

  try {
    const response = await fetch(rutaPanel('/api/configurador'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ajustes: ajustesSucios ? leerAjustes() : null,
        opciones,
        borradas: [...borradas],
      }),
    });
    const data = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string };

    // Sin sesion, las APIs del panel responden 404 para no delatarse.
    if (response.status === 401 || response.status === 404) {
      setStatus('Tu sesión ha caducado. Vuelve a entrar.', 'error');
      window.setTimeout(() => window.location.assign(rutaPanel('/login')), 1500);
      return;
    }
    if (!response.ok || !data.ok) {
      setStatus(data.message ?? 'No se pudo guardar. Inténtalo de nuevo.', 'error');
      guardarButton.disabled = false;
      return;
    }

    ajustesSucios = false;
    borradas.clear();
    filas.forEach((f) => {
      delete f.dataset.sucio;
      delete f.dataset.nueva;
      f.dataset.id = valor(f, 'id');
      campo(f, 'id')?.setAttribute('readonly', '');
      const punto = f.querySelector<HTMLElement>('[data-marca-sucio]');
      if (punto) punto.hidden = true;
    });
    refrescarBarra();
    setStatus('Cambios guardados. Se verán en la web en menos de un minuto.', 'success');
  } catch (err) {
    console.error('[admin-configurador] Error al guardar:', err);
    setStatus('No hay conexión. Los cambios siguen aquí, vuelve a intentarlo.', 'error');
    guardarButton.disabled = false;
  }
});

window.addEventListener('beforeunload', (event) => {
  if (hayCambios()) event.preventDefault();
});

export {};
