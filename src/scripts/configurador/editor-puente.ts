/**
 * Puente entre la vista previa (este iframe) y el editor del panel (la ventana
 * padre). Solo se carga en modo editor.
 *
 *   iframe -> padre   { cf: 'editar', ref }   se ha pulsado algo editable
 *                     { cf: 'paso', paso }    el stepper ha cambiado de paso
 *                     { cf: 'anadir', tipo, padre }
 *                     { cf: 'listo', paso }   la vista previa ha cargado
 *   padre -> iframe   { cf: 'texto', clave, valor }      cambio de texto al vuelo
 *                     { cf: 'imagen', clave, valor }     cambio de imagen fija al vuelo
 *                     { cf: 'paso-titulo', paso, titulo, subtitulo }
 *                     { cf: 'zonas', visibles }          mostrar/ocultar contornos
 *                     { cf: 'seleccion', ref }           resaltar lo que se edita
 *                     { cf: 'ir', paso }                 navegar a un paso
 *
 * Pulsar una tarjeta sigue seleccionandola en el stepper: asi se despliegan
 * sus subpaneles y el admin ve lo mismo que vera el cliente.
 */

const CLAVE_SCROLL = 'foodd-editor-scroll';

export const iniciarPuenteEditor = (raiz: HTMLElement, ir: (paso: string) => void) => {
  const padre = window.parent !== window ? window.parent : null;
  const enviar = (msg: Record<string, unknown>) => padre?.postMessage(msg, window.location.origin);

  raiz.classList.add('con-zonas');

  /* Captura: se avisa al padre antes de que el stepper reaccione. */
  raiz.addEventListener(
    'click',
    (event) => {
      const target = event.target as HTMLElement;

      const anadir = target.closest<HTMLElement>('[data-cf-add]');
      if (anadir) {
        event.preventDefault();
        event.stopPropagation();
        const [tipo, padreId] = (anadir.dataset.cfAdd ?? '').split('|');
        enviar({ cf: 'anadir', tipo, padre: padreId || null });
        return;
      }

      // Los enlaces (logo, salir, privacidad, WhatsApp) no navegan dentro del editor.
      if (target.closest('a')) event.preventDefault();

      const editable = target.closest<HTMLElement>('[data-cf-edit]');
      if (editable) enviar({ cf: 'editar', ref: editable.dataset.cfEdit });
    },
    true,
  );

  raiz.addEventListener('cf:paso', (event) => {
    enviar({ cf: 'paso', paso: (event as CustomEvent<string>).detail });
  });

  const marcarSeleccion = (ref: string | null) => {
    raiz.querySelectorAll('.is-editando').forEach((el) => el.classList.remove('is-editando'));
    if (!ref) return;
    raiz.querySelectorAll<HTMLElement>('[data-cf-edit]').forEach((el) => {
      if (el.dataset.cfEdit === ref) el.classList.add('is-editando');
    });
  };

  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin || event.source !== padre) return;
    const msg = event.data as Record<string, string | boolean | null>;
    switch (msg?.cf) {
      case 'texto': {
        raiz.querySelectorAll<HTMLElement>(`[data-cf-t="${CSS.escape(String(msg.clave))}"]`).forEach((el) => {
          let valor = String(msg.valor ?? '');
          const vars = el.dataset.cfVars ? (JSON.parse(el.dataset.cfVars) as Record<string, string>) : {};
          valor = valor.replace(/\{(\w+)\}/g, (_, v: string) => vars[v] ?? `{${v}}`);
          el.textContent = valor;
        });
        break;
      }
      case 'imagen':
        raiz.querySelectorAll<HTMLImageElement>(`[data-cf-img="${CSS.escape(String(msg.clave))}"]`).forEach((img) => {
          if (msg.valor) img.src = String(msg.valor);
        });
        break;
      case 'paso-titulo':
        raiz.querySelectorAll<HTMLElement>(`[data-cf-paso-titulo="${msg.paso}"]`).forEach((h) => {
          h.textContent = String(msg.titulo ?? '');
          if (h.dataset.tituloNormal !== undefined) h.dataset.tituloNormal = String(msg.titulo ?? '');
        });
        raiz.querySelectorAll<HTMLElement>(`[data-cf-paso-subtitulo="${msg.paso}"]`).forEach((p) => {
          p.textContent = String(msg.subtitulo ?? '');
        });
        break;
      case 'zonas':
        raiz.classList.toggle('con-zonas', Boolean(msg.visibles));
        break;
      case 'seleccion':
        marcarSeleccion(msg.ref ? String(msg.ref) : null);
        break;
      case 'ir':
        if (msg.paso) ir(String(msg.paso));
        break;
    }
  });

  /* Cada cambio del panel recarga la vista previa: se conserva el scroll. */
  try {
    const y = Number(sessionStorage.getItem(CLAVE_SCROLL));
    if (y) requestAnimationFrame(() => window.scrollTo(0, y));
  } catch {
    /* sin almacenamiento: se empieza arriba */
  }
  let tick = 0;
  window.addEventListener('scroll', () => {
    window.clearTimeout(tick);
    tick = window.setTimeout(() => {
      try {
        sessionStorage.setItem(CLAVE_SCROLL, String(window.scrollY));
      } catch {
        /* nada */
      }
    }, 120);
  });

  const actual = new URL(window.location.href).searchParams.get('paso');
  enviar({ cf: 'listo', paso: actual });
};
