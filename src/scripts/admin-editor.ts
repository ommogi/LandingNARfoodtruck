/**
 * Editor visual del configurador (/{ADMIN_PATH}/configurador).
 *
 * Se apoya en admin-configurador.ts (filas de opciones, lectura de ajustes,
 * guardado) y anade:
 *   - la vista previa: cada cambio reconstruye el catalogo borrador y lo manda
 *     por POST al iframe (/{ADMIN_PATH}/vista). Los textos, imagenes fijas y
 *     titulos de paso se aplican ademas al instante por postMessage, sin
 *     esperar a la recarga;
 *   - la seleccion: lo que se pulsa en la vista previa abre su formulario;
 *   - anadir opciones desde la vista previa, reordenarlas y editar las listas.
 *
 * Protocolo de mensajes: ver src/scripts/configurador/editor-puente.ts.
 */

import { campo, leerAjustes, leerFila, marcarAjustes, marcarSucia, valor } from './admin-configurador';
import { validarImagen } from '../data/imagenes';
import { rutaPanel } from './admin-rutas';
import './ui/controles';

const editor = document.querySelector<HTMLElement>('[data-editor]');
const iframe = document.querySelector<HTMLIFrameElement>('[data-ed-iframe]');
const panel = document.querySelector<HTMLElement>('[data-ed-panel]');
const form = document.querySelector<HTMLFormElement>('[data-ed-form]');
const borradorInput = document.querySelector<HTMLInputElement>('[data-ed-borrador]');

if (editor && iframe && panel && form && borradorInput) {
  const selPaso = editor.querySelector<HTMLSelectElement>('[data-ed-paso]');
  const lienzo = editor.querySelector<HTMLElement>('[data-ed-lienzo]');
  const zonas = editor.querySelector<HTMLInputElement>('[data-ed-zonas]');
  const titulo = panel.querySelector<HTMLElement>('[data-ed-titulo]');
  const tituloTipo = panel.querySelector<HTMLElement>('[data-ed-titulo-tipo]');
  const ayuda = panel.querySelector<HTMLElement>('[data-ed-ayuda]');
  const volver = panel.querySelector<HTMLButtonElement>('[data-ed-volver]');
  const scroll = panel.querySelector<HTMLElement>('.ed-panel-scroll');
  const TIPOS = JSON.parse(editor.querySelector('[data-ed-tipos]')?.textContent ?? '{}') as Record<string, string>;

  let pasoActual = 'proyecto';
  let modo: 'paso' | 'general' | 'ref' = 'paso';
  let refActual: string | null = null;
  let filaActual: HTMLElement | null = null;

  const enviar = (msg: Record<string, unknown>) => iframe.contentWindow?.postMessage(msg, window.location.origin);

  const filas = () => [...panel.querySelectorAll<HTMLElement>('[data-opcion]')];
  const filaDe = (id: string) => filas().find((f) => f.dataset.id === id || valor(f, 'id') === id) ?? null;
  const nombrePaso = () => selPaso?.selectedOptions[0]?.textContent ?? '';

  /* --------------------------------------------------- Que se ve en el panel */

  const mostrar = () => {
    panel.querySelectorAll<HTMLElement>('[data-ed-bloque]').forEach((b) => (b.hidden = true));
    filas().forEach((f) => f.classList.remove('is-visible'));
    filaActual = null;
    if (volver) volver.hidden = modo === 'paso';

    const ver = (ref: string) => {
      const b = panel.querySelector<HTMLElement>(`[data-ed-bloque="${CSS.escape(ref)}"]`);
      if (b) b.hidden = false;
      return b;
    };
    const verGrupo = (grupo: string) =>
      panel.querySelectorAll<HTMLElement>(`[data-ed-grupo="${grupo}"]`).forEach((b) => (b.hidden = false));
    const cabecera = (tipo: string, texto: string, ayudaTexto = '') => {
      if (tituloTipo) tituloTipo.textContent = tipo;
      if (titulo) titulo.textContent = texto;
      if (ayuda) ayuda.textContent = ayudaTexto;
    };

    if (modo === 'paso') {
      ver(`p:${pasoActual}`);
      verGrupo(pasoActual);
      cabecera('Textos de este paso', nombrePaso(), 'Pulsa cualquier tarjeta, texto o imagen de la vista previa para editarlo aquí.');
    } else if (modo === 'general') {
      ver('a:general');
      verGrupo('general');
      cabecera('Ajustes y textos generales', 'Barra lateral, botones y navegación');
    } else if (refActual) {
      const [tipo, ...resto] = refActual.split(':');
      const id = resto.join(':');
      if (tipo === 'o') {
        const fila = filaDe(id);
        if (fila) {
          filaActual = fila;
          fila.classList.add('is-visible');
          (fila as HTMLDetailsElement).open = true;
          ver('orden');
          cabecera(TIPOS[fila.dataset.tipo ?? ''] ?? 'Opción', valor(fila, 'nombre') || 'Nueva opción', 'Los cambios se ven al momento en la vista previa.');
        }
      } else if (tipo === 't' || tipo === 'i') {
        const b = ver(`t:${id}`);
        cabecera(tipo === 'i' ? 'Imagen' : 'Texto', b?.querySelector('label')?.firstChild?.textContent?.trim() ?? id);
        b?.querySelector<HTMLElement>('[data-texto]')?.focus();
      } else if (tipo === 'p') {
        ver(`p:${id}`);
        cabecera('Título del paso', nombrePaso());
      } else if (tipo === 'l') {
        const b = ver(`l:${id}`);
        cabecera('Lista', b?.querySelector('.ed-sub')?.textContent ?? id);
      } else if (tipo === 'a') {
        ver('a:general');
        cabecera('Ajustes generales', 'Precio y barra lateral');
      }
    }

    enviar({ cf: 'seleccion', ref: modo === 'ref' ? refActual : null });
    scroll?.scrollTo({ top: 0 });
  };

  /* --------------------------------------------------- Vista previa */

  let espera = 0;

  const recargar = () => {
    const opciones = filas().map((f) => {
      // El precio no le hace falta a la vista previa.
      const { precio: _p, unidad: _u, ...o } = leerFila(f);
      return o;
    });
    borradorInput.value = JSON.stringify({ opciones, ajustes: leerAjustes() });
    form.action = rutaPanel(`/vista?paso=${encodeURIComponent(pasoActual)}`);
    form.submit();
  };

  const programarRecarga = () => {
    window.clearTimeout(espera);
    espera = window.setTimeout(recargar, 450);
  };

  document.addEventListener('ed:cambio', (event) => {
    const origen = (event as CustomEvent<{ origen: HTMLElement | null }>).detail.origen;

    // Textos e imagenes fijas: al instante, sin recargar.
    const clave = origen?.dataset.texto;
    if (clave && (origen instanceof HTMLInputElement || origen instanceof HTMLTextAreaElement)) {
      const valorTexto = origen.value;
      if (clave.startsWith('img.')) {
        enviar({ cf: 'imagen', clave, valor: valorTexto });
        panel.querySelectorAll<HTMLImageElement>(`[data-ed-vista-texto="${CSS.escape(clave)}"]`).forEach((i) => (i.src = valorTexto));
      } else {
        enviar({ cf: 'texto', clave, valor: valorTexto || origen.dataset.defecto });
      }
      return;
    }

    // Titulo y subtitulo de un paso: tambien al instante.
    if (origen?.dataset.paso && origen.dataset.pasoCampo) {
      const paso = origen.dataset.paso;
      const leer = (c: string) =>
        panel.querySelector<HTMLInputElement>(`[data-paso="${paso}"][data-paso-campo="${c}"]`)?.value ?? '';
      enviar({ cf: 'paso-titulo', paso, titulo: leer('titulo'), subtitulo: leer('subtitulo') });
      return;
    }

    // La opcion que se estaba editando se ha borrado: vuelta a los textos del paso.
    if (filaActual && !filaActual.isConnected) {
      modo = 'paso';
      mostrar();
    }

    // Lo demas (opciones, listas, precios, orden…) necesita volver a pintar.
    if (filaActual && titulo) titulo.textContent = valor(filaActual, 'nombre') || 'Nueva opción';
    programarRecarga();
  });

  /* --------------------------------------------------- Mensajes de la vista previa */

  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin || event.source !== iframe.contentWindow) return;
    const msg = event.data as { cf?: string; ref?: string; paso?: string; tipo?: string; padre?: string | null };

    switch (msg.cf) {
      case 'listo':
        enviar({ cf: 'zonas', visibles: zonas?.checked ?? true });
        enviar({ cf: 'seleccion', ref: modo === 'ref' ? refActual : null });
        break;
      case 'paso':
        if (msg.paso && msg.paso !== pasoActual) {
          pasoActual = msg.paso;
          if (selPaso) selPaso.value = pasoActual;
          if (modo === 'paso') mostrar();
        }
        break;
      case 'editar':
        if (msg.ref) {
          modo = 'ref';
          refActual = msg.ref;
          mostrar();
        }
        break;
      case 'anadir':
        if (msg.tipo) anadirOpcion(msg.tipo, msg.padre ?? null);
        break;
    }
  });

  /* --------------------------------------------------- Barra superior */

  selPaso?.addEventListener('change', () => {
    pasoActual = selPaso.value;
    modo = 'paso';
    enviar({ cf: 'ir', paso: pasoActual });
    mostrar();
  });

  editor.querySelectorAll<HTMLButtonElement>('[data-ed-disp]').forEach((b) =>
    b.addEventListener('click', () => {
      const movil = b.dataset.edDisp === 'movil';
      lienzo?.classList.toggle('is-movil', movil);
      editor.querySelectorAll('[data-ed-disp]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    }),
  );

  zonas?.addEventListener('change', () => enviar({ cf: 'zonas', visibles: zonas.checked }));

  editor.querySelector('[data-ed-general]')?.addEventListener('click', () => {
    modo = 'general';
    mostrar();
  });

  volver?.addEventListener('click', () => {
    modo = 'paso';
    mostrar();
  });

  /* --------------------------------------------------- Anadir y ordenar opciones */

  const PREFIJO: Record<string, string> = {
    equipo: 'equipo',
    cocina: 'cocina',
    cocina_servicio: 'servicio',
    ambientacion: 'amb',
    branding: 'brand',
    espacio: 'espacio',
    acceso: 'acceso',
    logistica: 'logistica',
  };

  const hermanas = (fila: HTMLElement) =>
    filas()
      .filter((f) => f.dataset.tipo === fila.dataset.tipo && (valor(f, 'padre') || '') === (valor(fila, 'padre') || ''))
      .sort((a, b) => Number(valor(a, 'orden')) - Number(valor(b, 'orden')));

  const anadirOpcion = (tipo: string, padre: string | null) => {
    const plantilla = panel.querySelector<HTMLTemplateElement>(`[data-plantilla="${tipo}"]`);
    const destino = panel.querySelector<HTMLElement>(`[data-lista="${tipo}"]`);
    const copia = plantilla?.content.firstElementChild?.cloneNode(true) as HTMLElement | undefined;
    if (!copia || !destino) return;

    const prefijo = padre ?? PREFIJO[tipo] ?? '';
    let n = 1;
    const idDe = (i: number) => (prefijo ? `${prefijo}.nueva_${i}` : `nueva_${i}`);
    while (filaDe(idDe(n))) n += 1;

    destino.append(copia);
    const set = (nombre: string, v: string) => {
      const c = campo(copia, nombre);
      if (c) c.value = v;
    };
    set('id', idDe(n));
    set('nombre', 'Nueva opción');
    if (padre) set('padre', padre);
    const orden = Math.max(0, ...hermanas(copia).filter((f) => f !== copia).map((f) => Number(valor(f, 'orden')) || 0)) + 1;
    set('orden', String(orden));

    modo = 'ref';
    refActual = `o:${idDe(n)}`;
    marcarSucia(copia);
    mostrar();
    const nombre = campo(copia, 'nombre') as HTMLInputElement | null;
    nombre?.focus();
    nombre?.select();
  };


  panel.querySelector('[data-ed-bloque="orden"]')?.addEventListener('click', (event) => {
    const boton = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-ed-mover]');
    if (!boton || !filaActual) return;
    const lista = hermanas(filaActual);
    // Si hay ordenes repetidos, se renumeran antes de mover.
    lista.forEach((f, i) => {
      const c = campo(f, 'orden');
      if (c && Number(c.value) !== i + 1) {
        c.value = String(i + 1);
        f.dataset.sucio = '';
      }
    });
    const i = lista.indexOf(filaActual);
    const j = i + Number(boton.dataset.edMover);
    const otra = lista[j];
    if (!otra) return;
    const a = campo(filaActual, 'orden');
    const b = campo(otra, 'orden');
    if (!a || !b) return;
    [a.value, b.value] = [b.value, a.value];
    marcarSucia(otra);
    marcarSucia(filaActual);
  });

  /* --------------------------------------------------- Textos, imagenes y listas */

  panel.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;

    const restaurar = target.closest<HTMLButtonElement>('[data-restaurar]');
    if (restaurar) {
      const c = panel.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-texto="${CSS.escape(restaurar.dataset.restaurar ?? '')}"]`);
      if (c) {
        c.value = c.dataset.defecto ?? '';
        marcarAjustes(c);
      }
      return;
    }

    const anadir = target.closest<HTMLButtonElement>('[data-ed-anadir-item]');
    if (anadir) {
      const n = anadir.dataset.edAnadirItem ?? '';
      const plantilla = panel.querySelector<HTMLTemplateElement>(`[data-ed-plantilla-item="${n}"]`);
      const destino = panel.querySelector<HTMLElement>(`[data-ed-lista="${n}"]`);
      const copia = plantilla?.content.firstElementChild?.cloneNode(true) as HTMLElement | undefined;
      if (!copia || !destino) return;
      const id = copia.querySelector<HTMLInputElement>('[data-item-campo="id"]');
      if (id) id.value = `item_${Date.now().toString(36)}`;
      destino.append(copia);
      copia.querySelector<HTMLInputElement>('[data-item-campo="nombre"]')?.focus();
      marcarAjustes(null);
      return;
    }

    const quitar = target.closest<HTMLButtonElement>('[data-ed-quitar-item]');
    if (quitar) {
      const lista = quitar.closest('[data-ed-lista]');
      if (lista && lista.querySelectorAll('[data-ed-item]').length <= 1) {
        window.alert('La lista necesita al menos un elemento.');
        return;
      }
      quitar.closest('[data-ed-item]')?.remove();
      marcarAjustes(null);
    }
  });

  panel.addEventListener('change', async (event) => {
    const input = event.target as HTMLInputElement;
    const clave = input.dataset?.subirTexto;
    if (!clave || !input.files?.[0]) return;

    const motivo = validarImagen(input.files[0]);
    if (motivo) {
      window.alert(motivo);
      input.value = '';
      return;
    }

    const datos = new FormData();
    datos.append('archivo', input.files[0]);
    datos.append('id', clave.replace(/\W+/g, '_'));
    try {
      const response = await fetch(rutaPanel('/api/configurador-imagen'), { method: 'POST', body: datos });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; url?: string; message?: string };
      if (!response.ok || !data.ok || !data.url) {
        window.alert(data.message ?? 'No se pudo subir la imagen.');
        return;
      }
      const c = panel.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-texto="${CSS.escape(clave)}"]`);
      if (c) {
        c.value = data.url;
        marcarAjustes(c);
      }
    } catch {
      window.alert('No hay conexión. Inténtalo de nuevo.');
    } finally {
      input.value = '';
    }
  });

  mostrar();
}

export {};
