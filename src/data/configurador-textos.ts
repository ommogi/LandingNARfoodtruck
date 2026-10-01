/**
 * Textos, imagenes fijas y listas pequenas del configurador.
 *
 * Todo lo que el stepper pinta y no es una opcion del catalogo vive aqui con
 * su valor por defecto. El admin lo cambia desde el editor visual y se guarda
 * en configurador_ajustes.textos / .listas (migracion 0005). Una clave que no
 * este guardada, o este vacia, usa el valor de aqui.
 *
 * Modulo PURO: lo usan el servidor, los componentes .astro y el bundle del
 * navegador (los mensajes del calendario y del resumen).
 *
 * Plantillas: "{nombre}" se sustituye con las variables de t().
 */

import type { Catalogo, PasoId } from './configurador';

export type TipoTexto = 'texto' | 'largo' | 'imagen';
export type GrupoTexto = PasoId | 'general';

export interface DefTexto {
  /** Valor por defecto. */
  v: string;
  /** Rotulo en el editor. */
  e: string;
  /** Paso donde aparece: agrupa la lista «Textos de este paso». */
  g: GrupoTexto;
  tipo: TipoTexto;
}

const tx = (g: GrupoTexto, e: string, v: string, tipo: TipoTexto = 'texto'): DefTexto => ({ g, e, v, tipo });
const largo = (g: GrupoTexto, e: string, v: string) => tx(g, e, v, 'largo');
const img = (g: GrupoTexto, e: string, v: string) => tx(g, e, v, 'imagen');

export const TEXTOS = {
  /* ---------------- General: cabecera, navegacion y barra lateral */
  'paso.proyecto': tx('general', 'Nombre del paso 1', 'Tu proyecto'),
  'paso.fecha': tx('general', 'Nombre del paso 2', 'Fecha y disponibilidad'),
  'paso.configuracion': tx('general', 'Nombre del paso 3', 'Configuración'),
  'paso.equipamiento': tx('general', 'Nombre del paso 4', 'Equipamiento'),
  'paso.cocina': tx('general', 'Nombre del paso 5', 'Servicio de cocina'),
  'paso.ambientacion': tx('general', 'Nombre del paso 6', 'Ambientación'),
  'paso.branding': tx('general', 'Nombre del paso 7', 'Branding'),
  'paso.logistica': tx('general', 'Nombre del paso 8', 'Ubicación y logística'),
  'paso.resumen': tx('general', 'Nombre del paso 9', 'Resumen'),
  'paso.solicitud': tx('general', 'Nombre del paso 10', 'Solicitud'),
  'general.pastilla': tx('general', 'Pastilla sobre el título', 'Paso {n} de {total}'),
  'nav.volver': tx('general', 'Botón volver', 'Volver'),
  'nav.continuar': tx('general', 'Botón continuar', 'Continuar'),
  'nav.guardarVolver': tx('general', 'Botón al editar desde el resumen', 'Guardar y volver al resumen'),
  'nav.alResumen': tx('general', 'Botón volver al resumen', 'Volver al resumen'),
  'nav.solicitarDesdeResumen': tx('general', 'Botón del resumen', 'Continuar y solicitar presupuesto'),
  'nav.solicitarRoadshow': tx('general', 'Botón del resumen (Roadshow)', 'Solicitar propuesta para mi roadshow'),
  'nav.enviar': tx('general', 'Botón de envío', 'Solicitar presupuesto'),
  'nav.enviando': tx('general', 'Botón mientras se envía', 'Enviando…'),
  'nav.siguiente': tx('general', 'Pista del siguiente paso', 'Siguiente paso: {paso}'),
  'side.titulo': tx('general', 'Barra lateral: título', 'Tu configuración'),
  'side.rentalTitulo': tx('general', 'Barra lateral: nombre del alquiler base', 'FOODD Rental Base'),
  'side.desde': tx('general', 'Barra lateral: precio', 'Desde {precio} + IVA / día'),
  'side.sinSeleccionar': tx('general', 'Barra lateral: fila vacía', 'Aún no seleccionado'),
  'side.noAplica': tx('general', 'Barra lateral: paso que no aplica', 'No aplica'),
  'side.completa': tx('general', 'Barra lateral: resumen completo', 'Configuración completa'),
  'side.incompleta': tx('general', 'Barra lateral: resumen incompleto', 'Configuración incompleta'),
  'side.fila.proyecto': tx('general', 'Barra lateral: fila 1', 'Actividad'),
  'side.fila.fecha': tx('general', 'Barra lateral: fila 2', 'Fecha'),
  'side.fila.configuracion': tx('general', 'Barra lateral: fila 3', 'Configuración'),
  'side.fila.equipamiento': tx('general', 'Barra lateral: fila 4', 'Equipamiento'),
  'side.fila.cocina': tx('general', 'Barra lateral: fila 5', 'Servicio de cocina'),
  'side.fila.ambientacion': tx('general', 'Barra lateral: fila 6', 'Ambientación'),
  'side.fila.branding': tx('general', 'Barra lateral: fila 7', 'Branding'),
  'side.fila.logistica': tx('general', 'Barra lateral: fila 8', 'Ubicación y logística'),
  'side.fila.resumen': tx('general', 'Barra lateral: fila 9', 'Resumen'),
  'side.ayudaTitulo': tx('general', 'Ayuda: título', '¿Necesitas ayuda?'),
  'side.ayudaTexto': largo('general', 'Ayuda: texto', 'Nuestro equipo puede asesorarte para encontrar la mejor solución para tu proyecto.'),
  'side.ayudaBoton': tx('general', 'Ayuda: botón', 'Hablar con un asesor'),
  'side.ayudaMensaje': largo('general', 'Mensaje de WhatsApp', 'Hola, estoy configurando FOODD en la web y me gustaría hablar con un asesor.'),
  'side.movilProgreso': tx('general', 'Móvil: progreso', '{hechos} de {total} apartados completos'),
  'img.rentalBase': img('general', 'Imagen del alquiler base', '/configurador/rental-base.webp'),
  'general.lema': largo('general', 'Lema junto al título (pasos 1 y 3)', 'Un mismo FOODD,\ninfinitas posibilidades'),
  'general.oculta': tx('general', 'Etiqueta de opción oculta (solo en el editor)', 'Oculta'),

  /* ---------------- Paso 1 */
  'proyecto.seleccionado': tx('proyecto', 'Panel: «Has seleccionado…»', 'Has seleccionado {nombre}'),
  'proyecto.preguntaSubtipo': tx('proyecto', 'Panel: pregunta del subtipo', '¿Qué tipo de {nombre} necesitas?'),
  'proyecto.textoLabel': tx('proyecto', 'Texto libre: etiqueta', 'Cuéntanos qué tienes en mente'),
  'proyecto.textoPlaceholder': tx('proyecto', 'Texto libre: ejemplo', 'Describe brevemente tu proyecto…'),
  'proyecto.aviso': largo('proyecto', 'Aviso del panel', 'En el siguiente paso podrás indicarnos cuándo necesitas FOODD y comprobar su disponibilidad.'),
  'img.lateralProyecto': img('proyecto', 'Foto lateral del panel', '/configurador/viaja.webp'),

  /* ---------------- Paso 2 */
  'fecha.tituloRoadshow': tx('fecha', 'Título si es Roadshow', '¿Cuáles son las fechas de tu roadshow?'),
  'fecha.situacion': tx('fecha', 'Bloque 1: título', 'Selecciona tu situación'),
  'fecha.fechas': tx('fecha', 'Bloque 2: título', 'Selecciona las fechas'),
  'fecha.fechasSubConocida': tx('fecha', 'Bloque 2: ayuda (con fecha)', 'Indica el día, el periodo o los días sueltos de tu proyecto en el calendario.'),
  'fecha.fechasSubVarias': tx('fecha', 'Bloque 2: ayuda (varias fechas)', 'Marca entre 2 y 5 fechas posibles y elige con cuál quieres continuar.'),
  'fecha.unDia': tx('fecha', 'Selector: un día', 'Un solo día'),
  'fecha.variosDias': tx('fecha', 'Selector: varios días seguidos', 'Varios días'),
  'fecha.diasSueltos': tx('fecha', 'Selector: días sueltos', 'Días sueltos'),
  'fecha.msgDiasTitulo': tx('fecha', 'Días sueltos: título vacío', 'Marca tus días'),
  'fecha.msgDiasTexto': tx('fecha', 'Días sueltos: texto vacío', 'Pulsa en el calendario cada día que necesites FOODD, por ejemplo el 3, el 5 y el 7.'),
  'fecha.leyendaDisponible': tx('fecha', 'Leyenda: disponible', 'Disponible'),
  'fecha.leyendaRevisar': tx('fecha', 'Leyenda: a revisar', 'A revisar'),
  'fecha.leyendaNo': tx('fecha', 'Leyenda: no disponible', 'No disponible'),
  'fecha.leyendaSel': tx('fecha', 'Leyenda: seleccionada', 'Seleccionada'),
  'fecha.elegirAlternativa': tx('fecha', 'Varias fechas: pregunta', '¿Con qué fecha quieres continuar?'),
  'fecha.avisoComprobacionTitulo': tx('fecha', 'Aviso de comprobación: título', 'Esta comprobación corresponde únicamente a la disponibilidad inicial de FOODD.'),
  'fecha.avisoComprobacion': largo('fecha', 'Aviso de comprobación: texto', 'Los servicios adicionales que selecciones después están sujetos a disponibilidad o validación por parte de nuestro equipo.'),
  'fecha.sinFecha': largo('fecha', 'Aviso sin fecha', 'No pasa nada. Puedes continuar configurando tu proyecto y facilitarnos la fecha más adelante. La disponibilidad se comprobará cuando la tengas.'),
  'fecha.roadshowTitulo': tx('fecha', 'Roadshow: título del bloque', 'Paradas de tu roadshow'),
  'fecha.roadshowSub': tx('fecha', 'Roadshow: ayuda', 'Indica la ciudad y la fecha de cada parada. Mínimo recomendado: dos localizaciones.'),
  'fecha.anadirParada': tx('fecha', 'Roadshow: botón añadir parada', 'Añadir parada'),
  'fecha.ciudad': tx('fecha', 'Roadshow: campo ciudad', 'Ciudad'),
  'fecha.fechaParada': tx('fecha', 'Roadshow: campo fecha', 'Fecha'),
  'fecha.roadshowAvisoTitulo': tx('fecha', 'Roadshow: aviso título', 'Ruta pendiente de validación logística'),
  'fecha.roadshowAviso': largo('fecha', 'Roadshow: aviso texto', 'Las fechas no se evalúan como eventos independientes: revisaremos el intervalo necesario entre paradas aunque todas las fechas aparezcan libres.'),
  'fecha.noReservaTitulo': tx('fecha', 'Aviso final: título', 'La disponibilidad mostrada no constituye una reserva.'),
  'fecha.noReserva': largo('fecha', 'Aviso final: texto', 'La fecha quedará confirmada una vez FOODD revise la información y formalice el proyecto.'),
  'fecha.msgElige': tx('fecha', 'Calendario: título sin fecha', 'Selecciona una fecha'),
  'fecha.msgEligeTexto': tx('fecha', 'Calendario: texto sin fecha', 'Elige en el calendario el día de tu proyecto.'),
  'fecha.msgDesde': tx('fecha', 'Calendario: título a medio periodo', 'Desde el {fecha}'),
  'fecha.msgDesdeTexto': tx('fecha', 'Calendario: texto a medio periodo', 'Ahora selecciona el último día del periodo.'),
  'fecha.msgDisponible': tx('fecha', 'Calendario: título disponible', 'FOODD disponible · {fechas}'),
  'fecha.msgDisponibleTexto': tx('fecha', 'Calendario: texto disponible', 'FOODD está disponible inicialmente para las fechas seleccionadas.'),
  'fecha.msgRevisar': tx('fecha', 'Calendario: título a revisar', 'A revisar · {fechas}'),
  'fecha.msgRevisarTexto': largo('fecha', 'Calendario: texto a revisar', 'Nos queda poca disponibilidad en alguna de las fechas. Podemos seguir, pero la revisaremos cuanto antes.'),
  'fecha.msgNoDisponible': tx('fecha', 'Calendario: título no disponible', 'No disponible'),
  'fecha.msgPeriodoMalo': largo('fecha', 'Calendario: periodo con días ocupados', 'El periodo incluye días en los que FOODD no está disponible ({dias}).'),
  'fecha.msgCambiar': tx('fecha', 'Calendario: botón cambiar fecha', 'Cambiar fecha'),
  'fecha.msgCercanas': tx('fecha', 'Calendario: botón fechas cercanas', 'Ver fechas cercanas'),
  'fecha.msgVariasTitulo': tx('fecha', 'Varias fechas: título vacío', 'Marca tus fechas posibles'),
  'fecha.msgVariasTexto': tx('fecha', 'Varias fechas: texto vacío', 'Puedes marcar hasta 5 fechas en el calendario.'),
  'fecha.msgVariasN': tx('fecha', 'Varias fechas: recuento', '{n} fechas marcadas'),
  'fecha.msgVariasElegida': tx('fecha', 'Varias fechas: fecha elegida', 'Continuarás con el {fecha}.'),
  'fecha.msgOtraFecha': tx('fecha', 'Varias fechas: falta otra', 'Marca al menos otra fecha posible.'),
  'fecha.msgEligeAbajo': tx('fecha', 'Varias fechas: elige una', 'Elige abajo con qué fecha quieres continuar.'),

  /* ---------------- Paso 3 */
  'configuracion.panelTitulo': tx('configuracion', 'Panel: título', '¿Qué tipo de configuración necesitas?'),
  'configuracion.panelTexto': tx('configuracion', 'Panel: texto', 'Selecciona la opción que mejor se adapta a tu proyecto.'),
  'configuracion.textoLabel': tx('configuracion', 'A medida: etiqueta', 'Cuéntanos qué configuración necesitas'),
  'configuracion.textoPlaceholder': tx('configuracion', 'A medida: ejemplo', 'Qué quieres preparar o servir, volumen aproximado, necesidades especiales…'),
  'configuracion.aviso': largo('configuracion', 'Aviso del panel', 'En el siguiente paso te recomendaremos el equipamiento ideal para tu configuración.'),

  /* ---------------- Paso 4 */
  'equipamiento.incluidoTitulo': tx('equipamiento', 'Incluido: título', 'Ya incluido en tu food truck'),
  'equipamiento.incluidoSub': tx('equipamiento', 'Incluido: texto', 'Este equipamiento forma parte de la configuración base y está incluido en todos los alquileres.'),
  'equipamiento.recomendadoTitulo': tx('equipamiento', 'Recomendado: título', 'Recomendado para tu configuración'),
  'equipamiento.recomendadoSub': tx('equipamiento', 'Recomendado: texto', 'Según el tipo de proyecto y configuración que has elegido, este es el equipamiento que mejor se adapta.'),
  'equipamiento.sinRecomendados': largo('equipamiento', 'Recomendado: sin recomendaciones', 'Tu configuración ya está preparada con el equipamiento incluido. Si necesitas algo más, añádelo desde el catálogo.'),
  'equipamiento.catalogoTitulo': tx('equipamiento', 'Catálogo: título', 'Todo nuestro equipamiento'),
  'equipamiento.catalogoSub': tx('equipamiento', 'Catálogo: texto', '¿Necesitas algo más? Explora el resto del equipamiento disponible.'),
  'equipamiento.buscar': tx('equipamiento', 'Catálogo: buscador', 'Buscar equipamiento…'),
  'equipamiento.todos': tx('equipamiento', 'Catálogo: pestaña todos', 'Todos'),
  'equipamiento.sinResultados': tx('equipamiento', 'Catálogo: sin resultados', 'No hay equipamiento que coincida con la búsqueda.'),
  'equipamiento.otroTitulo': tx('equipamiento', 'Otro equipamiento: título', '¿No encuentras lo que necesitas?'),
  'equipamiento.otroTexto': largo('equipamiento', 'Otro equipamiento: texto', 'Si necesitas otro equipamiento o consumibles específicos, cuéntanoslo. Lo revisaremos y te propondremos la mejor solución.'),
  'equipamiento.otroPlaceholder': tx('equipamiento', 'Otro equipamiento: ejemplo', 'Ej.: una segunda nevera, vasos compostables para 300 personas…'),
  'equipamiento.incluido': tx('equipamiento', 'Etiqueta incluido', 'Incluido'),
  'equipamiento.recomendado': tx('equipamiento', 'Etiqueta recomendado', 'Recomendado'),
  'equipamiento.anadir': tx('equipamiento', 'Botón añadir', 'Añadir'),
  'equipamiento.anadido': tx('equipamiento', 'Botón añadido', 'Añadido'),
  'equipamiento.quitar': tx('equipamiento', 'Botón quitar (al pasar por encima)', 'Quitar'),

  /* ---------------- Paso 5 */
  'cocina.b1': tx('cocina', 'Bloque 1: título', '1. Cocinero'),
  'cocina.b1Nombre': tx('cocina', 'Bloque 1: nombre', 'Cocinero profesional'),
  'cocina.b1Texto': largo('cocina', 'Bloque 1: texto', 'Profesional encargado de preparar y cocinar la propuesta gastronómica acordada utilizando el equipamiento disponible en FOODD.'),
  'cocina.b1Cantidad': tx('cocina', 'Bloque 1: cantidad', 'Cocinero profesional × 1'),
  'cocina.b2': tx('cocina', 'Bloque 2: título', '2. ¿Qué tipo de servicio necesitas?'),
  'cocina.b2Sub': tx('cocina', 'Bloque 2: ayuda', 'Selecciona una o varias opciones.'),
  'cocina.b3': tx('cocina', 'Bloque 3: título', '3. Cuéntanos qué quieres preparar'),
  'cocina.b3Placeholder': tx('cocina', 'Bloque 3: ejemplo', 'Ej.: Queremos preparar hamburguesas y patatas durante una fiesta de empresa.'),
  'cocina.b4': tx('cocina', 'Bloque 4: título', '4. ¿Para cuántas personas está previsto el servicio?'),
  'cocina.personas': tx('cocina', 'Bloque 4: unidad', 'personas'),
  'cocina.noSe': tx('cocina', 'Bloque 4: no lo sé', 'Todavía no lo sé'),
  'cocina.b4Nota': tx('cocina', 'Bloque 4: nota', 'Puede ser diferente del número total de asistentes al evento.'),
  'cocina.b5': tx('cocina', 'Bloque 5: título', '5. ¿Quién aportará los alimentos e ingredientes?'),
  'cocina.b6': tx('cocina', 'Bloque 6: título', '6. ¿Hay alguna necesidad especial?'),
  'cocina.notasLabel': tx('cocina', 'Observaciones: etiqueta', 'Observaciones (opcional)'),
  'cocina.notasPlaceholder': tx('cocina', 'Observaciones: ejemplo', 'Añade cualquier información que consideres importante para preparar el servicio.'),
  'cocina.avisoTitulo': tx('cocina', 'Aviso: título', 'Disponibilidad del servicio · Sujeto a disponibilidad'),
  'cocina.aviso': largo('cocina', 'Aviso: texto', 'El servicio de cocinero no incluye alimentos, ingredientes ni consumibles salvo que se indiquen expresamente en la propuesta final. La disponibilidad del cocinero dependerá de la fecha, horario y ubicación, y FOODD la comprobará antes de confirmar el presupuesto.'),

  /* ---------------- Paso 6 */
  'ambientacion.soloTitulo': tx('ambientacion', 'Tarjeta sin ambientación: título', 'Solo FOODD'),
  'ambientacion.soloSub': tx('ambientacion', 'Tarjeta sin ambientación: subtítulo', 'No necesito ambientación'),
  'ambientacion.soloTexto': largo('ambientacion', 'Tarjeta sin ambientación: texto', 'Alquilas FOODD sin mobiliario ni elementos de ambientación exterior.'),
  'img.soloFoodd': img('ambientacion', 'Tarjeta sin ambientación: foto', '/configurador/solo-foodd.webp'),
  'ambientacion.conTitulo': tx('ambientacion', 'Tarjeta con ambientación: título', 'FOODD + Ambientación'),
  'ambientacion.conSub': tx('ambientacion', 'Tarjeta con ambientación: subtítulo', 'Quiero completar el espacio'),
  'ambientacion.conTexto': largo('ambientacion', 'Tarjeta con ambientación: texto', 'Añade mobiliario y elementos de ambientación para crear un entorno coherente alrededor de FOODD.'),
  'img.conAmbientacion': img('ambientacion', 'Tarjeta con ambientación: foto', '/configurador/amb-mediterraneo.webp'),
  'ambientacion.elegirTitulo': tx('ambientacion', 'Ambientes: título', 'Elige el ambiente que mejor encaja con tu proyecto'),
  'ambientacion.elegirSub': largo('ambientacion', 'Ambientes: texto', 'Tres propuestas con diferentes niveles de mobiliario y puesta en escena. Podrás adaptar las cantidades a tu proyecto.'),
  'ambientacion.diferente': tx('ambientacion', 'A medida: antetítulo', '¿Buscas algo diferente?'),
  'ambientacion.medidaLabel': tx('ambientacion', 'A medida: etiqueta', 'Cuéntanos cómo imaginas el espacio'),
  'ambientacion.medidaPlaceholder': tx('ambientacion', 'A medida: ejemplo', 'Estilo, elementos, referencias…'),
  'ambientacion.categoriasLabel': tx('ambientacion', 'A medida: categorías', '¿Qué te gustaría incluir? (opcional)'),
  'ambientacion.personasLabel': tx('ambientacion', 'Capacidad: pregunta', '¿Para cuántas personas quieres preparar el espacio?'),
  'ambientacion.personasNota': tx('ambientacion', 'Capacidad: nota', 'Capacidad aproximada del espacio ambientado, no el total de asistentes.'),
  'ambientacion.detalleTitulo': tx('ambientacion', 'Detalle: título ({nombre} = ambiente)', 'Configura tu ambiente {nombre}'),
  'ambientacion.cambiar': tx('ambientacion', 'Detalle: botón cambiar', 'Cambiar ambiente'),
  'ambientacion.detallePersonas': tx('ambientacion', 'Detalle: capacidad', '¿Para cuántas personas quieres ambientar la zona del food truck?'),
  'ambientacion.detallePersonasNota': tx('ambientacion', 'Detalle: capacidad nota', 'No tiene que coincidir con el número total de asistentes al evento.'),
  'ambientacion.propuestaTitulo': tx('ambientacion', 'Detalle: propuesta título', 'Selección recomendada para tu espacio.'),
  'ambientacion.propuestaSub': tx('ambientacion', 'Detalle: propuesta texto', 'Puedes ajustar las cantidades si lo necesitas.'),
  'ambientacion.restablecer': tx('ambientacion', 'Detalle: restablecer', 'Restablecer propuesta'),
  'ambientacion.incluida': tx('ambientacion', 'Detalle: pieza incluida', 'Incluida'),
  'ambientacion.idealPara': tx('ambientacion', 'Detalle: ideal para', 'Ideal para'),
  'ambientacion.roadshowTitulo': tx('ambientacion', 'Roadshow: título', 'Ambientación del Roadshow'),
  'ambientacion.roadshowTexto': largo('ambientacion', 'Roadshow: texto', 'Tu ambiente estará presente en todas las paradas o adaptado según cada ubicación.'),
  'ambientacion.roadshowMantener': tx('ambientacion', 'Roadshow: mantener', 'Mantener este ambiente en todas las paradas'),
  'ambientacion.roadshowMantenerTexto': largo('ambientacion', 'Roadshow: mantener texto', 'Utilizaremos la misma configuración de ambientación en todas las ubicaciones de tu Roadshow.'),
  'ambientacion.roadshowAdaptar': tx('ambientacion', 'Roadshow: adaptar', 'Necesito adaptar la ambientación según la parada'),
  'ambientacion.roadshowAdaptarTexto': largo('ambientacion', 'Roadshow: adaptar texto', 'Podrás indicarnos necesidades especiales para cada ubicación.'),
  'ambientacion.roadshowNota': largo('ambientacion', 'Roadshow: nota', 'El mobiliario y los elementos de ambientación están sujetos a disponibilidad para las fechas y ubicaciones seleccionadas. Confirmaremos la composición definitiva en la propuesta.'),
  'ambientacion.aviso': largo('ambientacion', 'Aviso', 'La ambientación está sujeta a disponibilidad de stock para tu fecha. Si hace falta más mobiliario, lo gestionaremos con proveedores.'),

  /* ---------------- Paso 7 */
  'branding.noTitulo': tx('branding', 'Tarjeta no: título', 'No, mantener FOODD original'),
  'branding.noTexto': largo('branding', 'Tarjeta no: texto', 'Con la estética original de FOODD. Elegante, atemporal y reconocible.'),
  'branding.siTitulo': tx('branding', 'Tarjeta sí: título', 'Sí, quiero personalizarlo'),
  'branding.siTexto': largo('branding', 'Tarjeta sí: texto', 'Aplica tu marca y crea una presencia visual única y alineada con tu proyecto.'),
  'branding.tipoTitulo': tx('branding', 'Bloque 2: título', 'Elige el tipo de personalización'),
  'branding.archivosTitulo': tx('branding', 'Bloque 3: título', 'Archivos de marca'),
  'branding.archivosSub': tx('branding', 'Bloque 3: texto', 'Cuéntanos en qué estado tienes tus archivos para que podamos prepararlo todo.'),
  'branding.subidaTitulo': tx('branding', 'Archivos: título', 'Archivos de marca'),
  'branding.subidaTexto': largo('branding', 'Archivos: texto', 'Podrás enviarnos tus archivos (AI, EPS, PDF, SVG, PNG o JPG) cuando revisemos tu solicitud. Te escribiremos para recogerlos.'),
  'branding.marcaLabel': tx('branding', 'Campo marca', 'Nombre de la marca (opcional)'),
  'branding.infoLabel': tx('branding', 'Campo información', 'Información adicional (opcional)'),
  'branding.medidaLabel': tx('branding', 'Campo a medida', 'Describe la personalización que necesitas'),
  'branding.infoPlaceholder': tx('branding', 'Campo información: ejemplo', 'Cuéntanos cualquier detalle relevante sobre tu marca, colores, estilo o referencias…'),
  'branding.avisoTitulo': tx('branding', 'Aviso: título', 'Todo el branding está sujeto a validación de producción.'),
  'branding.aviso': largo('branding', 'Aviso: texto', 'Una vez recibamos tu solicitud, revisaremos la viabilidad técnica y te confirmaremos los detalles y plazos. Si la fecha está próxima, la personalización quedará a revisar.'),

  /* ---------------- Paso 8 */
  'logistica.b1': tx('logistica', '01: título', '01. ¿Dónde será el proyecto?'),
  'logistica.b1Sub': tx('logistica', '01: ayuda', 'Indícanos la ubicación aproximada.'),
  'logistica.localidad': tx('logistica', 'Campo localidad', 'Localidad'),
  'logistica.provincia': tx('logistica', 'Campo provincia', 'Provincia'),
  'logistica.provinciaVacia': tx('logistica', 'Provincia: sin elegir', 'Selecciona…'),
  'logistica.cp': tx('logistica', 'Campo código postal', 'Código postal'),
  'logistica.direccion': tx('logistica', 'Campo dirección', 'Dirección'),
  'logistica.direccionPlaceholder': tx('logistica', 'Dirección: ejemplo', 'Empieza a escribir la dirección…'),
  'logistica.direccionAyuda': tx('logistica', 'Dirección: ayuda del buscador', 'Elige una sugerencia y completaremos el código postal, la localidad y la provincia.'),
  'logistica.sinSugerencias': tx('logistica', 'Dirección: sin sugerencias', 'No encontramos esa dirección. Puedes escribirla a mano.'),
  'logistica.sinDireccion': tx('logistica', 'Casilla sin dirección', 'Todavía no conozco la dirección exacta'),
  'logistica.maps': tx('logistica', 'Enlace a Maps', 'Ver en Maps'),
  'logistica.b2': tx('logistica', '02: título', '02. ¿En qué horario necesitarás FOODD?'),
  'logistica.b2Sub': tx('logistica', '02: ayuda', 'Horario aproximado en el que deberá estar operativo.'),
  'logistica.inicio': tx('logistica', 'Campo inicio', 'Inicio del servicio'),
  'logistica.fin': tx('logistica', 'Campo fin', 'Fin del servicio'),
  'logistica.sinHorario': tx('logistica', 'Casilla sin horario', 'Todavía no tengo el horario definitivo'),
  'logistica.b2Nota': tx('logistica', '02: nota', 'Nosotros calcularemos los tiempos de entrega, instalación y recogida.'),
  'logistica.b3': tx('logistica', '03: título', '03. ¿Cuántas personas asistirán aproximadamente?'),
  'logistica.b3Sub': tx('logistica', '03: ayuda', 'Número total de asistentes al proyecto o evento.'),
  'logistica.personas': tx('logistica', '03: unidad', 'personas'),
  'logistica.noSe': tx('logistica', '03: no lo sé', 'Todavía no lo sé'),
  'logistica.b4': tx('logistica', '04: título', '04. ¿Dónde se instalará FOODD?'),
  'logistica.b4Sub': tx('logistica', '04: ayuda', 'Selecciona el tipo de espacio.'),
  'logistica.b5': tx('logistica', '05: título', '05. ¿Hay acceso para introducir y posicionar el remolque?'),
  'logistica.b5Sub': tx('logistica', '05: ayuda', 'Indícanos si el espacio permite el acceso de vehículos de gran tamaño.'),
  'logistica.b6': tx('logistica', '06: título', '¿Qué modalidad logística prefieres?'),
  'logistica.b6Sub': tx('logistica', '06: ayuda', 'Selecciona el nivel de servicio que mejor se adapte a tu proyecto.'),
  'logistica.b7': tx('logistica', '07: título', 'Información adicional (opcional)'),
  'logistica.b7Placeholder': tx('logistica', '07: ejemplo', 'Ej.: El acceso es por la entrada principal. Hay parking cerca. Se requiere acreditación.'),
  'logistica.fotos': largo('logistica', '07: nota de fotos', '¿Tienes fotos del acceso o de la zona de instalación? Te las pediremos al revisar tu solicitud.'),
  'logistica.paradaAsistentes': tx('logistica', 'Roadshow: campo asistentes', 'Asistentes aprox.'),
  'logistica.paradaEspacio': tx('logistica', 'Roadshow: campo espacio', 'Tipo de espacio'),
  'logistica.paradaAcceso': tx('logistica', 'Roadshow: campo acceso', 'Acceso para el remolque'),
  'logistica.paradaNotas': tx('logistica', 'Roadshow: campo observaciones', 'Observaciones'),
  'logistica.paradaCompleta': tx('logistica', 'Roadshow: parada completa', 'Completa'),
  'logistica.paradaPendiente': tx('logistica', 'Roadshow: parada pendiente', 'Datos pendientes'),
  'logistica.roadshowTitulo': tx('logistica', 'Roadshow: título', 'Completa la logística de tu roadshow'),
  'logistica.roadshowSub': largo('logistica', 'Roadshow: texto', 'Completa los datos disponibles de cada parada. FOODD calculará el recorrido y revisará la logística necesaria para toda la campaña.'),
  'logistica.roadshowAvisoTitulo': tx('logistica', 'Roadshow: aviso título', 'Estimación, no decisión final'),
  'logistica.roadshowAviso': largo('logistica', 'Roadshow: aviso texto', 'Horarios, descansos, accesos, montaje y restricciones pueden cambiar la viabilidad real. FOODD validará la ruta antes de presupuestar.'),
  'logistica.avisoTitulo': tx('logistica', 'Aviso: título', 'Viabilidad ≠ disponibilidad'),
  'logistica.aviso': largo('logistica', 'Aviso: texto', 'Una fecha puede estar disponible y la instalación seguir pendiente de validación: revisaremos accesos y condiciones del espacio antes de confirmar.'),

  /* ---------------- Paso 9 */
  'resumen.tuProyecto': tx('resumen', 'Tarjeta principal: antetítulo', 'Tu proyecto'),
  'resumen.editar': tx('resumen', 'Enlace editar', 'Editar'),
  'resumen.itinerario': tx('resumen', 'Roadshow: itinerario', 'Itinerario'),
  'resumen.editarRuta': tx('resumen', 'Roadshow: editar ruta', 'Editar ruta'),
  'resumen.card.configuracion': tx('resumen', 'Tarjeta: configuración', 'Configuración'),
  'resumen.card.fecha': tx('resumen', 'Tarjeta: fecha', 'Fecha'),
  'resumen.card.equipamiento': tx('resumen', 'Tarjeta: equipamiento', 'Equipamiento'),
  'resumen.card.cocina': tx('resumen', 'Tarjeta: cocina', 'Servicio de cocina'),
  'resumen.card.ambientacion': tx('resumen', 'Tarjeta: ambientación', 'Ambientación'),
  'resumen.card.branding': tx('resumen', 'Tarjeta: branding', 'Branding'),
  'resumen.card.logistica': tx('resumen', 'Tarjeta: logística', 'Ubicación y logística'),
  'resumen.antesTitulo': tx('resumen', 'Antes de confirmar: título', 'Antes de confirmar tu proyecto'),
  'resumen.necesitamos': tx('resumen', 'Antes de confirmar: columna 1', 'Necesitamos de ti'),
  'resumen.necesitamos1': tx('resumen', 'Columna 1 · punto 1', 'Revisa que toda la información sea correcta.'),
  'resumen.necesitamos2': tx('resumen', 'Columna 1 · punto 2', 'Confírmanos fechas, ubicación y horarios.'),
  'resumen.necesitamos3': tx('resumen', 'Columna 1 · punto 3', 'Cuéntanos cualquier detalle adicional.'),
  'resumen.revisara': tx('resumen', 'Antes de confirmar: columna 2', 'FOODD revisará'),
  'resumen.revisara1': tx('resumen', 'Columna 2 · punto 1', 'Disponibilidad de FOODD y del equipamiento.'),
  'resumen.revisara2': tx('resumen', 'Columna 2 · punto 2', 'Cocinero, ambientación y branding.'),
  'resumen.revisara3': tx('resumen', 'Columna 2 · punto 3', 'Viabilidad de la ubicación y logística.'),
  'resumen.estado': tx('resumen', 'Estado: título', 'Estado de tu proyecto'),
  'resumen.propuesta': tx('resumen', 'Propuesta: título', 'Tu propuesta'),
  'resumen.propuestaTexto': largo('resumen', 'Propuesta: texto', 'El precio final se calculará según la duración, ubicación, equipamiento y servicios seleccionados.'),
  'resumen.base': tx('resumen', 'Texto del equipamiento base', 'Nevera, congelador, zona de trabajo e iluminación'),
  'r.paradas': tx('resumen', 'Resumen: paradas', '{n} paradas · {ciudades}'),
  'r.paradasPorDefinir': tx('resumen', 'Resumen: sin paradas', 'Paradas por definir'),
  'r.parada': tx('resumen', 'Resumen: parada sin ciudad', 'Parada {n}'),
  'r.fechaPorDefinir': tx('resumen', 'Resumen: sin fecha', 'Fecha por definir'),
  'r.porDefinir': tx('resumen', 'Resumen: por definir', 'Por definir'),
  'r.ubicacionPorDefinir': tx('resumen', 'Resumen: sin ubicación', 'Ubicación por definir'),
  'r.noAplica': tx('resumen', 'Resumen: cocina no aplica', 'No aplica a esta configuración'),
  'r.soloFoodd': tx('resumen', 'Resumen: sin ambientación (corto)', 'Solo FOODD'),
  'r.foodOriginal': tx('resumen', 'Resumen: sin branding (corto)', 'FOODD original'),
  'r.horarioPorDefinir': tx('resumen', 'Resumen: sin horario', 'Horario por definir'),
  'r.asistentes': tx('resumen', 'Resumen: asistentes', '{n} asistentes'),
  'r.extra1': tx('resumen', 'Barra lateral: 1 extra', '{n} extra añadido'),
  'r.extrasN': tx('resumen', 'Barra lateral: varios extras', '{n} extras añadidos'),
  'r.equipoBase': tx('resumen', 'Resumen: solo equipamiento base', 'Equipamiento base'),
  'r.extrasTitulo1': tx('resumen', 'Resumen: 1 extra + base', '{n} extra + equipamiento base'),
  'r.extrasTituloN': tx('resumen', 'Resumen: extras + base', '{n} extras + equipamiento base'),
  'r.otros': tx('resumen', 'Resumen: otros equipos', 'Otros: {texto}'),
  'r.sinSeleccionar': tx('resumen', 'Resumen: tarjeta vacía', 'Sin seleccionar'),
  'r.personasPorDefinir': tx('resumen', 'Resumen: personas sin definir', 'Personas por definir'),
  'r.personas': tx('resumen', 'Resumen: personas', '{n} personas'),
  'r.propioPersonal': tx('resumen', 'Resumen: con personal propio', 'Trabajarás con tu propio personal.'),
  'r.noAplicaLargo': tx('resumen', 'Resumen: cocina no aplica (tarjeta)', 'No aplica a esta configuración.'),
  'r.sinAmbientacion': tx('resumen', 'Resumen: sin ambientación', 'Sin ambientación adicional.'),
  'r.imagenOriginal': tx('resumen', 'Resumen: sin branding', 'Mantiene la imagen original.'),
  'r.roadshowRuta': tx('resumen', 'Resumen: fecha Roadshow', 'Roadshow · ruta pendiente de validación logística'),
  'r.dispoPendiente': tx('resumen', 'Estado: fecha sin definir', 'Fecha pendiente de confirmación'),
  'r.dispoNo': tx('resumen', 'Estado: fecha no disponible', 'Fecha no disponible'),
  'r.dispoRevisar': tx('resumen', 'Estado: fecha a revisar', 'Fecha a revisar'),
  'r.dispoOk': tx('resumen', 'Estado: fecha disponible', 'Fecha inicialmente disponible'),
  'r.estadoFoodd': tx('resumen', 'Estado: fila FOODD', 'FOODD'),
  'r.estadoInstalacion': tx('resumen', 'Estado: fila instalación', 'Instalación'),
  'r.estadoCocinero': tx('resumen', 'Estado: fila cocinero', 'Cocinero'),
  'r.estadoAmbientacion': tx('resumen', 'Estado: fila ambientación', 'Ambientación'),
  'r.estadoBranding': tx('resumen', 'Estado: fila branding', 'Branding'),
  'r.estadoLogistica': tx('resumen', 'Estado: fila logística', 'Logística'),
  'r.pendValidacion': tx('resumen', 'Estado: pendiente de validación', 'Pendiente de validación'),
  'r.pendDisponibilidad': tx('resumen', 'Estado: pendiente de disponibilidad', 'Pendiente de disponibilidad'),
  'r.pendValoracion': tx('resumen', 'Estado: pendiente de valoración', 'Pendiente de valoración'),
  'r.pendRuta': tx('resumen', 'Estado: ruta pendiente', 'Ruta pendiente de validación'),
  'r.faltaFecha': tx('resumen', 'Pendiente: fecha', 'Fecha del proyecto'),
  'r.faltaDireccion': tx('resumen', 'Pendiente: dirección', 'Dirección exacta'),
  'r.faltaHorario': tx('resumen', 'Pendiente: horario', 'Horario definitivo'),
  'r.faltaArchivos': tx('resumen', 'Pendiente: archivos', 'Archivos de marca'),
  'r.pendientes': largo('resumen', 'Pendiente: frase', 'Información pendiente de tu parte: {lista}.'),
  'img.resumenPorDefecto': img('resumen', 'Foto de la tarjeta principal si no hay proyecto', '/configurador/proyecto-evento.webp'),

  /* ---------------- Paso 10 y exito */
  'solicitud.volverResumen': tx('solicitud', 'Botón volver al resumen', 'Volver al resumen'),
  'solicitud.s1': tx('solicitud', 'Sección 1: título', 'Datos de contacto'),
  'solicitud.s1Sub': tx('solicitud', 'Sección 1: texto', 'Necesitamos algunos datos para poder enviarte tu propuesta.'),
  'solicitud.nombre': tx('solicitud', 'Campo nombre', 'Nombre y apellidos'),
  'solicitud.empresa': tx('solicitud', 'Campo empresa', 'Empresa'),
  'solicitud.email': tx('solicitud', 'Campo email', 'Email'),
  'solicitud.telefono': tx('solicitud', 'Campo teléfono', 'Teléfono'),
  'solicitud.opcional': tx('solicitud', 'Marca de opcional', '(opcional)'),
  'solicitud.s2': tx('solicitud', 'Sección 2: título', 'Observaciones (opcional)'),
  'solicitud.s2Sub': tx('solicitud', 'Sección 2: texto', 'Cuéntanos cualquier detalle que consideres importante para preparar tu propuesta.'),
  'solicitud.s2Placeholder': tx('solicitud', 'Sección 2: ejemplo', 'Escribe aquí tu mensaje…'),
  'solicitud.s3': tx('solicitud', 'Sección 3: título', 'Privacidad y comunicaciones'),
  'solicitud.privacidad': tx('solicitud', 'Casilla privacidad (antes del enlace)', 'He leído y acepto la'),
  'solicitud.privacidadEnlace': tx('solicitud', 'Casilla privacidad (enlace)', 'Política de Privacidad'),
  'solicitud.comerciales': tx('solicitud', 'Casilla comunicaciones', 'Quiero recibir novedades y propuestas de FOODD.'),
  'solicitud.comercialesNota': tx('solicitud', 'Casilla comunicaciones: nota', '(opcional) Podrás darte de baja en cualquier momento.'),
  'solicitud.s4': tx('solicitud', 'Sección 4: título', 'Información importante'),
  'solicitud.importante': largo('solicitud', 'Sección 4: texto', 'El envío de esta solicitud no supone una reserva, no genera ningún cargo y no confirma automáticamente la disponibilidad de los servicios seleccionados. Revisaremos tu configuración y te enviaremos un presupuesto personalizado.'),
  'solicitud.errorCampos': largo('solicitud', 'Error de campos obligatorios', 'Revisa los campos marcados: nombre, email, teléfono y la aceptación de la política de privacidad son obligatorios.'),
  'exito.pastilla': tx('solicitud', 'Éxito: pastilla', 'Solicitud recibida'),
  'exito.titulo': tx('solicitud', 'Éxito: título', '¡Gracias! Hemos recibido tu solicitud'),
  'exito.referencia': tx('solicitud', 'Éxito: referencia', 'Referencia de solicitud:'),
  'exito.paso1': tx('solicitud', 'Éxito: paso 1', 'Revisamos tu proyecto'),
  'exito.paso2': tx('solicitud', 'Éxito: paso 2', 'Comprobamos disponibilidad y viabilidad'),
  'exito.paso3': tx('solicitud', 'Éxito: paso 3', 'Preparamos tu propuesta personalizada'),
  'exito.texto': largo('solicitud', 'Éxito: texto', 'Nos pondremos en contacto contigo una vez revisemos los detalles del proyecto.'),
  'exito.boton': tx('solicitud', 'Éxito: botón', 'Volver a la web'),
} satisfies Record<string, DefTexto>;

export type ClaveTexto = keyof typeof TEXTOS;

export const esClaveTexto = (clave: string): clave is ClaveTexto => clave in TEXTOS;

/**
 * Texto final: el guardado en el catalogo o el de por defecto, con las
 * variables {x} sustituidas.
 */
export const t = (catalogo: Pick<Catalogo, 'ajustes'> | null, clave: ClaveTexto, vars: Record<string, string | number> = {}) => {
  const guardado = catalogo?.ajustes.textos?.[clave];
  const base = guardado && guardado.trim() ? guardado : TEXTOS[clave].v;
  return base.replace(/\{(\w+)\}/g, (_, v: string) => (v in vars ? String(vars[v]) : `{${v}}`));
};

/* --------------------------------------------------- Listas pequenas */

export interface ItemLista {
  id: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  oculto?: boolean;
}

/**
 * fija: los ids los usa la logica; el admin cambia textos e icono y puede
 *       ocultar, pero no anadir ni quitar.
 * libre: el admin anade, quita y reordena.
 */
export const LISTAS = {
  situaciones: {
    e: 'Situaciones de la fecha',
    g: 'fecha',
    fija: true,
    items: [
      { id: 'known', nombre: 'Sí, tengo fecha', descripcion: 'Sé cuándo tendrá lugar el proyecto.', icono: 'calendar' },
      { id: 'multiple', nombre: 'Tengo varias fechas posibles', descripcion: 'Puedo adaptarme entre varias fechas.', icono: 'calendar-range' },
      {
        id: 'unknown',
        nombre: 'Todavía no tengo fecha definida',
        descripcion: 'No pasa nada. Puedes continuar configurando tu proyecto y facilitarnos la fecha más adelante.',
        icono: 'send',
      },
    ],
  },
  alimentos: {
    e: '¿Quién aporta los alimentos?',
    g: 'cocina',
    fija: true,
    items: [
      {
        id: 'cliente',
        nombre: 'Los aportará el cliente',
        descripcion: 'El cliente proporciona los alimentos, ingredientes y consumibles necesarios para desarrollar el servicio acordado.',
      },
      {
        id: 'foodd',
        nombre: 'Quiero que FOODD estudie una propuesta completa',
        descripcion: 'Cuéntanos qué necesitas y estudiaremos la posibilidad de incluir también los productos necesarios.',
      },
    ],
  },
  necesidades: {
    e: 'Necesidades especiales de cocina',
    g: 'cocina',
    fija: false,
    items: [
      { id: 'preparacion', nombre: 'Preparación previa' },
      { id: 'turnos', nombre: 'Servicio en varios turnos' },
      { id: 'continuado', nombre: 'Servicio continuado' },
      { id: 'alergias', nombre: 'Necesidades relacionadas con alergias o dietas' },
      { id: 'otra', nombre: 'Otra' },
    ],
  },
  personasAmbientacion: {
    e: 'Capacidades de la ambientación',
    g: 'ambientacion',
    fija: true,
    items: [
      { id: 'hasta_25', nombre: 'Hasta 25' },
      { id: '25_50', nombre: '25 – 50' },
      { id: '50_100', nombre: '50 – 100' },
      { id: 'mas_100', nombre: 'Más de 100' },
      { id: 'no_se', nombre: 'Todavía no lo sé' },
    ],
  },
  categoriasAmbientacion: {
    e: 'Categorías de ambientación a medida',
    g: 'ambientacion',
    fija: false,
    items: [
      { id: 'mesas', nombre: 'Mesas' },
      { id: 'sillas', nombre: 'Sillas / taburetes' },
      { id: 'lounge', nombre: 'Lounge' },
      { id: 'iluminacion', nombre: 'Iluminación' },
      { id: 'vegetacion', nombre: 'Vegetación' },
      { id: 'sombrillas', nombre: 'Sombrillas' },
      { id: 'decoracion', nombre: 'Decoración' },
      { id: 'otro', nombre: 'Otro' },
    ],
  },
  archivosBranding: {
    e: 'Estado de los archivos de marca',
    g: 'branding',
    fija: true,
    items: [
      { id: 'ready', nombre: 'Tengo archivos preparados', descripcion: 'Logotipos, colores, tipografías…', icono: 'doc' },
      { id: 'adaptar', nombre: 'Tengo logotipo pero necesito adaptación', icono: 'pencil' },
      { id: 'foodd', nombre: 'Necesito que FOODD prepare la propuesta', icono: 'lightbulb' },
      { id: 'despues', nombre: 'Los enviaré más adelante', icono: 'clock' },
    ],
  },
  categoriasEquipo: {
    e: 'Pestañas del catálogo de equipamiento',
    g: 'equipamiento',
    fija: true,
    items: [
      { id: 'coccion', nombre: 'Cocción' },
      { id: 'cafe_bebidas', nombre: 'Café & Bebidas' },
      { id: 'dulces', nombre: 'Dulces' },
      { id: 'conservacion', nombre: 'Conservación' },
      { id: 'preparacion', nombre: 'Preparación' },
      { id: 'consumibles', nombre: 'Consumibles' },
      { id: 'otros', nombre: 'Otros' },
    ],
  },
} satisfies Record<string, { e: string; g: GrupoTexto; fija: boolean; items: ItemLista[] }>;

export type NombreLista = keyof typeof LISTAS;

export const esNombreLista = (n: string): n is NombreLista => n in LISTAS;

/**
 * Lista final. Fija: se mezcla por id sobre la de por defecto (nunca aparecen
 * ids nuevos ni desaparecen los de la logica). Libre: la guardada sustituye a
 * la de por defecto si tiene algun elemento.
 */
export const lista = (
  catalogo: Pick<Catalogo, 'ajustes'> | null,
  nombre: NombreLista,
  { conOcultos = false } = {},
): ItemLista[] => {
  const def = LISTAS[nombre];
  const guardada = catalogo?.ajustes.listas?.[nombre];
  let items: ItemLista[];
  if (def.fija) {
    items = def.items.map((base) => {
      const g = guardada?.find((x) => x.id === base.id);
      return g ? { ...base, ...g, id: base.id, nombre: g.nombre?.trim() || base.nombre } : { ...base };
    });
  } else {
    items = guardada?.length ? guardada.map((x) => ({ ...x })) : def.items.map((x) => ({ ...x }));
  }
  return conOcultos ? items : items.filter((x) => !x.oculto);
};

/* --------------------------------------------------- Referencias del editor */

/**
 * Valor de data-cf-edit en modo editor, o undefined fuera de el (el HTML
 * publico no lleva ni rastro del editor).
 *   o:<id>  opcion      t:<clave>  texto      i:<clave>  imagen fija
 *   p:<paso> titulo/subtitulo del paso          l:<lista> lista pequena
 *   a:general  ajustes generales (precio desde, texto incluye…)
 */
export const refEdicion = (catalogo: Pick<Catalogo, 'editor'>, ref: string) =>
  catalogo.editor ? ref : undefined;
