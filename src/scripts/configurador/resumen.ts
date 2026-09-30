/**
 * Textos derivados del estado: filas de la barra lateral, tarjetas del resumen
 * (paso 9) y mini resumen del paso 10. Solo escribe
 * textContent; ningun precio pasa por aqui. Todas las frases salen de
 * configurador-textos.ts, asi que el admin las puede cambiar.
 */

import {
  esRoadshow,
  fechasServicio,
  muestraCocina,
  nombreDe,
  opcionPorId,
  pasoCompleto,
  TEXTO_ROADSHOW_AMBIENTACION,
  textoFecha,
  textoMobiliario,
  type Catalogo,
  type PasoId,
} from '../../data/configurador';
import { lista, t, type ClaveTexto, type NombreLista } from '../../data/configurador-textos';
import { esFechaReservable, estadoFecha } from '../../data/disponibilidad';
import { fechaCorta, getDispo, textoRango } from './calendario';
import { store } from './estado';

const unir = (partes: (string | number | null | undefined | false)[], sep = ' · ') => partes.filter(Boolean).join(sep);

export const crearResumen = (raiz: HTMLElement, catalogo: Catalogo) => {
  const e = () => store.estado;
  const n = (id: string | null | undefined) => nombreDe(catalogo, id);
  const tx = (k: ClaveTexto, vars?: Record<string, string | number>) => t(catalogo, k, vars);
  const deLista = (nombre: NombreLista, id: string | null | undefined) =>
    id ? lista(catalogo, nombre, { conOcultos: true }).find((x) => x.id === id)?.nombre ?? '' : '';

  const textoProyecto = () => unir([n(e().proyecto.tipo), n(e().proyecto.subtipo)]);

  const textoConfig = () => unir([n(e().configuracion.uso), n(e().configuracion.sub)]);

  const equiposElegidos = () => e().equipamiento.seleccion.map(n).filter(Boolean);

  const textoFechaCorta = () => {
    const f = e().fecha;
    if (esRoadshow(e())) {
      const ps = f.paradas.filter((p) => p.ciudad);
      return ps.length ? tx('r.paradas', { n: ps.length, ciudades: ps.map((p) => p.ciudad).join(' → ') }) : tx('r.paradasPorDefinir');
    }
    if (f.situacion === 'known' && f.modo === 'dias' && f.dias.length) {
      return [...f.dias].sort().map(fechaCorta).join(', ');
    }
    if (f.situacion === 'known' && f.inicio) {
      return f.modo === 'range' && f.fin ? textoRango(f.inicio, f.fin) : fechaCorta(f.inicio);
    }
    return textoFecha(e()) || tx('r.fechaPorDefinir');
  };

  const textoLugar = () => {
    if (esRoadshow(e())) return unir(e().fecha.paradas.map((p) => p.ciudad), ' → ') || tx('r.porDefinir');
    const l = e().logistica;
    return unir([l.localidad, l.provincia], ', ') || tx('r.ubicacionPorDefinir');
  };

  const textoCocina = () => {
    if (!muestraCocina(e(), catalogo)) return tx('r.noAplica');
    const c = e().cocina;
    if (!c.opcion) return '';
    if (c.opcion !== 'cocina.cocinero') return n(c.opcion);
    return unir([n(c.opcion), c.servicios.map(n).join(', ')]);
  };

  const textoAmbientacion = () => {
    const a = e().ambientacion;
    if (a.quiere === null) return '';
    if (!a.quiere) return tx('r.soloFoodd');
    const cap = deLista('personasAmbientacion', a.personas);
    return unir([n(a.opcion), cap && tx('r.personas', { n: cap })]);
  };

  const textoBranding = () => {
    const b = e().branding;
    if (b.quiere === null) return '';
    if (!b.quiere) return tx('r.foodOriginal');
    return unir([n(b.tipo), b.marca]);
  };

  const horario = () => {
    const l = e().logistica;
    return l.sinHorario ? tx('r.horarioPorDefinir') : l.inicio && l.fin ? `${l.inicio} – ${l.fin}` : '';
  };

  const textoLogistica = () => {
    const l = e().logistica;
    if (esRoadshow(e())) return unir([n(l.modo), tx('r.paradas', { n: e().fecha.paradas.length, ciudades: '' }).replace(/ · $/, '')]);
    return unir([textoLugar(), n(l.espacio), horario(), l.asistentes ? tx('r.asistentes', { n: l.asistentes }) : '', n(l.modo)]);
  };

  /** Valor corto de cada fila de la barra lateral. */
  const valorFila: Record<string, () => string> = {
    proyecto: textoProyecto,
    fecha: () => textoFecha(e()),
    configuracion: textoConfig,
    equipamiento: () => {
      const extras = equiposElegidos().length;
      if (extras) return tx(extras === 1 ? 'r.extra1' : 'r.extrasN', { n: extras });
      return e().configuracion.sub ? tx('r.equipoBase') : '';
    },
    cocina: textoCocina,
    ambientacion: textoAmbientacion,
    branding: textoBranding,
    logistica: () => (esRoadshow(e()) ? n(e().logistica.modo) : unir([e().logistica.localidad, n(e().logistica.modo)])),
    resumen: () => '',
  };

  /** Estado publico de la fecha, para el resumen y la insignia del paso 10. */
  const estadoDisponibilidad = (): { texto: string; clase: string } => {
    const fechas = fechasServicio(e());
    if (!fechas.length) return { texto: tx('r.dispoPendiente'), clase: 'is-pendiente' };
    const dispo = getDispo();
    if (fechas.some((f) => !esFechaReservable(f, dispo))) return { texto: tx('r.dispoNo'), clase: 'is-error' };
    if (fechas.some((f) => estadoFecha(f, dispo) === 'poca')) return { texto: tx('r.dispoRevisar'), clase: 'is-pendiente' };
    return { texto: tx('r.dispoOk'), clase: 'is-ok' };
  };

  const poner = (clave: string, texto: string) => {
    raiz.querySelectorAll<HTMLElement>(`[data-cf-r="${clave}"]`).forEach((el) => (el.textContent = texto));
  };

  const ponerImagen = (clave: string, src: string | null | undefined) => {
    raiz.querySelectorAll<HTMLImageElement>(`[data-cf-r-img="${clave}"]`).forEach((img) => {
      if (src) {
        if (img.getAttribute('src') !== src) img.src = src;
        img.hidden = false;
      } else if (clave === 'proyecto') {
        img.src = tx('img.resumenPorDefecto');
      } else {
        img.hidden = true;
      }
    });
  };

  const pintarResumen = () => {
    const est = e();
    poner('proyecto', textoProyecto() || tx('resumen.tuProyecto'));
    poner('fechaCorta', textoFechaCorta());
    poner('lugar', textoLugar());
    ponerImagen('proyecto', opcionPorId(catalogo, est.proyecto.subtipo)?.imagen ?? opcionPorId(catalogo, est.proyecto.tipo)?.imagen);

    poner('configuracionTitulo', textoConfig() || '—');
    poner('configuracion', est.configuracion.descripcion || opcionPorId(catalogo, est.configuracion.sub)?.descripcion || '');
    ponerImagen('configuracion', opcionPorId(catalogo, est.configuracion.uso)?.imagen);

    poner('fechaTitulo', textoFechaCorta());
    poner('fecha', esRoadshow(est) ? tx('r.roadshowRuta') : unir([horario(), estadoDisponibilidad().texto]));

    const extras = equiposElegidos();
    poner(
      'equipamientoTitulo',
      extras.length ? tx(extras.length === 1 ? 'r.extrasTitulo1' : 'r.extrasTituloN', { n: extras.length }) : tx('r.equipoBase'),
    );
    poner('equipamiento', unir([tx('resumen.base'), extras.join(', '), est.equipamiento.otros && tx('r.otros', { texto: est.equipamiento.otros })], '. '));

    poner('cocinaTitulo', textoCocina() ? n(est.cocina.opcion) || textoCocina() : tx('r.sinSeleccionar'));
    poner(
      'cocina',
      est.cocina.opcion === 'cocina.cocinero'
        ? unir([
            est.cocina.servicios.map(n).join(', '),
            est.cocina.personasNoSe ? tx('r.personasPorDefinir') : est.cocina.personas ? tx('r.personas', { n: est.cocina.personas }) : '',
            deLista('alimentos', est.cocina.alimentos),
          ])
        : muestraCocina(est, catalogo)
          ? est.cocina.opcion
            ? tx('r.propioPersonal')
            : ''
          : tx('r.noAplicaLargo'),
    );
    ponerImagen('cocina', est.cocina.opcion === 'cocina.cocinero' ? opcionPorId(catalogo, 'cocina.cocinero')?.imagen : null);

    poner('ambientacionTitulo', textoAmbientacion() || tx('r.sinSeleccionar'));
    poner(
      'ambientacion',
      est.ambientacion.quiere
        ? unir(
            [
              textoMobiliario(est) ||
                opcionPorId(catalogo, est.ambientacion.opcion)?.etiquetas.join(', ') ||
                est.ambientacion.descripcion,
              esRoadshow(est) && est.ambientacion.opcion && TEXTO_ROADSHOW_AMBIENTACION[est.ambientacion.roadshow],
            ],
            '. ',
          )
        : tx('r.sinAmbientacion'),
    );
    ponerImagen('ambientacion', est.ambientacion.quiere ? opcionPorId(catalogo, est.ambientacion.opcion)?.imagen : null);

    poner('brandingTitulo', textoBranding() || tx('r.sinSeleccionar'));
    poner(
      'branding',
      est.branding.quiere ? unir([deLista('archivosBranding', est.branding.archivos), est.branding.descripcion], '. ') : tx('r.imagenOriginal'),
    );
    ponerImagen('branding', est.branding.quiere ? opcionPorId(catalogo, est.branding.tipo)?.imagen : null);

    poner('logisticaTitulo', textoLugar());
    poner('logistica', textoLogistica());

    // Insignia de disponibilidad (paso 10)
    const d = estadoDisponibilidad();
    raiz.querySelectorAll<HTMLElement>('[data-cf-r-dispo]').forEach((el) => {
      el.textContent = d.texto;
      el.className = `cf-estado-badge ${d.clase}`;
    });

    // Itinerario Roadshow
    const itinerario = raiz.querySelector<HTMLElement>('[data-cf-itinerario]');
    if (itinerario) {
      itinerario.textContent = '';
      est.fecha.paradas.forEach((p, i) => {
        const li = document.createElement('li');
        const num = document.createElement('span');
        num.className = 'cf-num is-rust';
        num.textContent = String(i + 1);
        const txt = document.createElement('span');
        txt.textContent = unir([p.ciudad || tx('r.parada', { n: i + 1 }), p.fecha && fechaCorta(p.fecha).toUpperCase()]);
        li.append(num, txt);
        itinerario.append(li);
      });
    }

    // Estado del proyecto
    const estados = raiz.querySelector<HTMLElement>('[data-cf-estados]');
    if (estados) {
      const filas: [string, string, string][] = [[tx('r.estadoFoodd'), d.texto, d.clase]];
      if (!esRoadshow(est)) filas.push([tx('r.estadoInstalacion'), tx('r.pendValidacion'), 'is-pendiente']);
      if (est.cocina.opcion === 'cocina.cocinero' && muestraCocina(est, catalogo)) {
        filas.push([tx('r.estadoCocinero'), tx('r.pendDisponibilidad'), 'is-pendiente']);
      }
      if (est.ambientacion.quiere) filas.push([tx('r.estadoAmbientacion'), tx('r.pendDisponibilidad'), 'is-pendiente']);
      if (est.branding.quiere) filas.push([tx('r.estadoBranding'), tx('r.pendValidacion'), 'is-pendiente']);
      filas.push([tx('r.estadoLogistica'), esRoadshow(est) ? tx('r.pendRuta') : tx('r.pendValoracion'), 'is-pendiente']);
      estados.textContent = '';
      filas.forEach(([k, v, c]) => {
        const li = document.createElement('li');
        const a = document.createElement('span');
        a.textContent = k;
        const b = document.createElement('span');
        b.className = `cf-estado-badge ${c}`;
        b.textContent = v;
        li.append(a, b);
        estados.append(li);
      });
    }

    const pendientes = raiz.querySelector<HTMLElement>('[data-cf-pendientes]');
    if (pendientes) {
      const faltan: string[] = [];
      if (!fechasServicio(est).length) faltan.push(tx('r.faltaFecha'));
      if (!esRoadshow(est) && (est.logistica.sinDireccion || !est.logistica.direccion)) faltan.push(tx('r.faltaDireccion'));
      if (!esRoadshow(est) && est.logistica.sinHorario) faltan.push(tx('r.faltaHorario'));
      if (est.branding.quiere && est.branding.archivos !== 'ready') faltan.push(tx('r.faltaArchivos'));
      pendientes.textContent = '';
      if (faltan.length) {
        const p = document.createElement('p');
        p.className = 'cf-card-text';
        p.textContent = tx('r.pendientes', { lista: faltan.join(', ') });
        pendientes.append(p);
      }
    }
  };

  const pintarSidebar = (visibles: PasoId[], alcanzable: (p: PasoId) => boolean) => {
    const todoCompleto = visibles.slice(0, -2).every((p) => pasoCompleto(p, e(), catalogo));
    raiz.querySelectorAll<HTMLElement>('[data-cf-side-fila]').forEach((fila) => {
      const paso = fila.dataset.cfSideFila as PasoId;
      const visible = visibles.includes(paso);
      const valor = valorFila[paso]?.() ?? '';
      const completo = visible && paso !== 'resumen' && pasoCompleto(paso, e(), catalogo) && Boolean(valor);
      fila.classList.toggle('is-completo', completo || (paso === 'resumen' && todoCompleto));
      fila.classList.toggle('is-no-aplica', !visible);
      const v = fila.querySelector<HTMLElement>('[data-cf-side-valor]');
      if (v) {
        v.textContent = !visible
          ? tx('side.noAplica')
          : paso === 'resumen'
            ? tx(todoCompleto ? 'side.completa' : 'side.incompleta')
            : valor || tx('side.sinSeleccionar');
      }
      const boton = fila.querySelector<HTMLButtonElement>('button');
      if (boton) boton.disabled = !visible || !alcanzable(paso);
    });
  };

  return { pintarResumen, pintarSidebar };
};
