/**
 * Arranque del configurador (/configurador).
 *
 *   estado.ts        store + sessionStorage
 *   vista.ts         enlace declarativo (data-elegir, data-bind, data-cuando…)
 *   navegacion.ts    paso actual, Continuar/Volver, cabecera de pasos
 *   calendario.ts    paso 2
 *   paradas.ts       Roadshow (pasos 2 y 8)
 *   equipamiento.ts  paso 4
 *   resumen.ts       barra lateral, paso 9 y mini resumen del paso 10
 *   envio.ts         paso 10
 *   cajon.ts         barra lateral en movil
 *   animaciones.ts   entradas y micro-interacciones (GSAP)
 *
 * Cada cambio de estado repinta todo: son unos cientos de nodos y el coste es
 * despreciable frente a la claridad de no tener que saber que depende de que.
 */

import { CATALOGO_RESPALDO, type Catalogo } from '../../data/configurador';
import { alCambiar, notificar } from './estado';
import { crearVista } from './vista';
import { crearNavegacion } from './navegacion';
import { cargarDisponibilidad, iniciarCalendario } from './calendario';
import { iniciarParadas } from './paradas';
import { iniciarEquipamiento } from './equipamiento';
import { crearResumen } from './resumen';
import { iniciarEnvio } from './envio';
import { iniciarCajon } from './cajon';
import { iniciarPuenteEditor } from './editor-puente';
import { iniciarAnimaciones } from './animaciones';

const raiz = document.querySelector<HTMLElement>('[data-configurador]');

const leerCatalogo = (): Catalogo => {
  try {
    const json = document.querySelector('[data-cf-catalogo-json]')?.textContent ?? '';
    return JSON.parse(json) as Catalogo;
  } catch {
    return CATALOGO_RESPALDO;
  }
};

if (raiz) {
  const catalogo = leerCatalogo();
  const vista = crearVista(raiz, catalogo);
  const nav = crearNavegacion(raiz, catalogo);
  const pintarCalendario = iniciarCalendario(raiz, catalogo);
  const pintarParadas = iniciarParadas(raiz, catalogo);
  const pintarEquipamiento = iniciarEquipamiento(raiz);
  const resumen = crearResumen(raiz, catalogo);
  const animarSidebar = iniciarAnimaciones(raiz, { editor: Boolean(catalogo.editor) });

  iniciarCajon(raiz);
  iniciarEnvio(raiz, {
    catalogo,
    pasoPendiente: () => {
      const p = nav.primerIncompleto();
      return p === 'resumen' ? null : p;
    },
    irA: (paso) => nav.mostrar(paso as Parameters<typeof nav.mostrar>[0]),
  });

  const pintarTodo = () => {
    vista.pintar();
    pintarCalendario();
    pintarParadas();
    pintarEquipamiento();
    resumen.pintarResumen();
    resumen.pintarSidebar(nav.visibles(), nav.alcanzable);
    nav.pintar();
    animarSidebar();
  };

  alCambiar(pintarTodo);
  pintarTodo();
  nav.arrancar();
  if (catalogo.editor) {
    iniciarPuenteEditor(raiz, (paso) => nav.mostrar(paso as Parameters<typeof nav.mostrar>[0]));
  }
  void cargarDisponibilidad();
  notificar();
}
