/**
 * Buscador de direcciones con Google Places (API New) para el paso 8 y las
 * paradas del Roadshow. Al elegir una sugerencia se rellenan solos el codigo
 * postal, la localidad y la provincia (en una parada: CP y, si estaba vacia, la
 * ciudad).
 *
 * Necesita PUBLIC_GOOGLE_MAPS_KEY (Maps JavaScript API + Places API (New),
 * restringida por referente). Sin clave no hace nada: los campos siguen siendo
 * manuales, como antes. El SDK de Google solo se carga la primera vez que
 * alguien enfoca un campo de direccion.
 *
 * Los campos se rellenan como si los escribiera el cliente (value + evento
 * input/change): vista.ts y paradas.ts actualizan el estado y la validacion
 * sin saber que existe este modulo.
 */

import { PROVINCIAS, type Catalogo } from '../../data/configurador';
import { t } from '../../data/configurador-textos';

const CLAVE = import.meta.env.PUBLIC_GOOGLE_MAPS_KEY?.trim() ?? '';

const SELECTOR = '[data-bind="logistica.direccion"], [data-parada-campo="direccion"]';
const MIN_CARACTERES = 3;
const ESPERA_MS = 250;

/* --------------------------------------------------- Tipos minimos del SDK */

interface Componente {
  longText: string;
  shortText: string;
  types: string[];
}
interface Lugar {
  addressComponents?: Componente[];
  formattedAddress?: string;
  fetchFields(o: { fields: string[] }): Promise<unknown>;
}
interface Prediccion {
  text: { text: string };
  mainText?: { text: string };
  secondaryText?: { text: string };
  toPlace(): Lugar;
}
interface LibreriaPlaces {
  AutocompleteSessionToken: new () => object;
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions(peticion: Record<string, unknown>): Promise<{
      suggestions: { placePrediction?: Prediccion | null }[];
    }>;
  };
}

/* --------------------------------------------------- Carga del SDK */

let carga: Promise<LibreriaPlaces> | null = null;

const cargarPlaces = () =>
  (carga ??= new Promise<LibreriaPlaces>((ok, ko) => {
    const w = window as unknown as Record<string, unknown> & {
      google?: { maps: { importLibrary(n: string): Promise<unknown> } };
    };
    w.__narMapsListo = () =>
      w.google!.maps.importLibrary('places').then((lib) => ok(lib as LibreriaPlaces), ko);
    const script = document.createElement('script');
    const params = new URLSearchParams({
      key: CLAVE,
      v: 'weekly',
      loading: 'async',
      language: 'es',
      region: 'ES',
      callback: '__narMapsListo',
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = () => ko(new Error('No se pudo cargar Google Maps'));
    document.head.append(script);
  }));

/* --------------------------------------------------- Provincias */

const plano = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/^(provincia de|provincia)\s+/, '')
    .trim();

/** Nombres que Google devuelve en otra lengua o forma, hacia los de PROVINCIAS. */
const ALIAS: Record<string, string> = {
  valencia: 'Valencia',
  'valencia/valencia': 'Valencia',
  alacant: 'Alicante',
  'alicante/alacant': 'Alicante',
  castello: 'Castellón',
  'castellon/castello': 'Castellón',
  'illes balears': 'Baleares',
  'islas baleares': 'Baleares',
  'balearic islands': 'Baleares',
  bizkaia: 'Vizcaya',
  biscay: 'Vizcaya',
  gipuzkoa: 'Guipúzcoa',
  araba: 'Álava',
  'araba/alava': 'Álava',
  'la coruna': 'A Coruña',
  coruna: 'A Coruña',
  lerida: 'Lleida',
  gerona: 'Girona',
  orense: 'Ourense',
  'santa cruz de tenerife': 'Santa Cruz de Tenerife',
  'las palmas': 'Las Palmas',
};

const provinciaDe = (nombre: string | undefined): string => {
  if (!nombre) return '';
  const p = plano(nombre);
  return ALIAS[p] ?? PROVINCIAS.find((prov) => plano(prov) === p) ?? '';
};

/* --------------------------------------------------- Lectura del lugar */

interface Direccion {
  direccion: string;
  cp: string;
  localidad: string;
  provincia: string;
}

const leerLugar = (lugar: Lugar): Direccion => {
  const comps = lugar.addressComponents ?? [];
  const de = (...tipos: string[]) => {
    for (const tipo of tipos) {
      const c = comps.find((x) => x.types.includes(tipo));
      if (c) return c.longText;
    }
    return '';
  };
  const calle = [de('route'), de('street_number')].filter(Boolean).join(', ');
  const nivel2 = de('administrative_area_level_2');
  const nivel1 = de('administrative_area_level_1');
  return {
    // Sin calle (un lugar, un recinto) se usa la primera parte de la direccion.
    direccion: calle || (lugar.formattedAddress ?? '').split(',')[0]!.trim(),
    cp: de('postal_code'),
    localidad: de('locality', 'postal_town', 'administrative_area_level_3', 'administrative_area_level_4'),
    // Ceuta y Melilla no tienen nivel 2; las uniprovinciales lo repiten.
    provincia: provinciaDe(nivel2) || provinciaDe(nivel1),
  };
};

/* --------------------------------------------------- Modulo */

export const iniciarDirecciones = (raiz: HTMLElement, catalogo: Catalogo) => {
  if (!CLAVE) return () => {};

  const tx = (k: Parameters<typeof t>[1]) => t(catalogo, k);
  let lista: HTMLUListElement | null = null;
  let campo: HTMLInputElement | null = null;
  let predicciones: Prediccion[] = [];
  let activa = -1;
  let token: object | null = null;
  let temporizador = 0;
  let ultimaPeticion = 0;
  let averiado = false;

  /* ---------------- Pintado del desplegable */

  const cerrar = () => {
    lista?.remove();
    lista = null;
    predicciones = [];
    activa = -1;
    campo?.setAttribute('aria-expanded', 'false');
    campo?.removeAttribute('aria-activedescendant');
  };

  const resaltar = (i: number) => {
    if (!lista || !campo) return;
    activa = i;
    lista.querySelectorAll<HTMLElement>('[role="option"]').forEach((op, n) => {
      op.classList.toggle('is-activa', n === i);
      op.setAttribute('aria-selected', String(n === i));
    });
    if (i >= 0) campo.setAttribute('aria-activedescendant', `cf-sug-${i}`);
    else campo.removeAttribute('aria-activedescendant');
  };

  const pintar = (input: HTMLInputElement, items: Prediccion[]) => {
    cerrar();
    campo = input;
    predicciones = items;
    lista = document.createElement('ul');
    lista.className = 'cf-sugerencias';
    lista.id = 'cf-sugerencias';
    lista.setAttribute('role', 'listbox');

    if (!items.length) {
      const vacio = document.createElement('li');
      vacio.className = 'cf-sugerencias-vacio';
      vacio.textContent = tx('logistica.sinSugerencias');
      lista.append(vacio);
    }
    items.forEach((p, i) => {
      const op = document.createElement('li');
      op.id = `cf-sug-${i}`;
      op.setAttribute('role', 'option');
      op.setAttribute('aria-selected', 'false');
      const principal = document.createElement('strong');
      principal.textContent = p.mainText?.text ?? p.text.text;
      const secundario = document.createElement('span');
      secundario.textContent = p.secondaryText?.text ?? '';
      op.append(principal, secundario);
      // pointerdown + preventDefault: el campo no pierde el foco antes del clic.
      op.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        void elegir(i);
      });
      lista!.append(op);
    });
    // Atribucion obligatoria al mostrar resultados de Places sin mapa.
    const marca = document.createElement('li');
    marca.className = 'cf-sugerencias-marca';
    marca.setAttribute('aria-hidden', 'true');
    marca.textContent = 'Google Maps';
    lista.append(marca);

    input.closest('.cf-campo')?.append(lista);
    input.setAttribute('aria-controls', lista.id);
    input.setAttribute('aria-expanded', 'true');
  };

  /* ---------------- Busqueda */

  const buscar = async (input: HTMLInputElement) => {
    const texto = input.value.trim();
    if (texto.length < MIN_CARACTERES || averiado) {
      cerrar();
      return;
    }
    const id = ++ultimaPeticion;
    try {
      const places = await cargarPlaces();
      token ??= new places.AutocompleteSessionToken();
      const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: texto,
        sessionToken: token,
        includedRegionCodes: ['es'],
        language: 'es',
        region: 'es',
      });
      // Una respuesta lenta no pisa a otra mas reciente.
      if (id !== ultimaPeticion || document.activeElement !== input) return;
      pintar(
        input,
        suggestions.map((s) => s.placePrediction).filter((p): p is Prediccion => Boolean(p)).slice(0, 5),
      );
    } catch (error) {
      // Clave mala, API sin activar o cuota agotada: se sigue a mano, sin insistir.
      averiado = true;
      cerrar();
      console.warn('[direcciones] Google Places no disponible; la dirección se rellena a mano.', error);
    }
  };

  /* ---------------- Relleno */

  const poner = (el: HTMLInputElement | HTMLSelectElement | null, valor: string, evento = 'input') => {
    if (!el || !valor) return;
    el.value = valor;
    el.dispatchEvent(new Event(evento, { bubbles: true }));
  };

  const rellenar = (input: HTMLInputElement, d: Direccion) => {
    poner(input, d.direccion);
    const i = input.dataset.paradaI;
    if (i !== undefined) {
      poner(raiz.querySelector<HTMLInputElement>(`[data-parada-i="${i}"][data-parada-campo="cp"]`), d.cp);
      // La ciudad la eligio el cliente en el paso 2: solo se completa si falta.
      const ciudad = raiz.querySelector<HTMLInputElement>(`[data-parada-i="${i}"][data-parada-campo="ciudad"]`);
      if (ciudad && !ciudad.value.trim()) poner(ciudad, d.localidad);
      return;
    }
    poner(raiz.querySelector<HTMLInputElement>('[data-bind="logistica.cp"]'), d.cp);
    poner(raiz.querySelector<HTMLInputElement>('[data-bind="logistica.localidad"]'), d.localidad);
    poner(raiz.querySelector<HTMLSelectElement>('[data-bind="logistica.provincia"]'), d.provincia, 'change');
  };

  const elegir = async (i: number) => {
    const p = predicciones[i];
    const input = campo;
    if (!p || !input) return;
    cerrar();
    try {
      const lugar = p.toPlace();
      await lugar.fetchFields({ fields: ['addressComponents', 'formattedAddress'] });
      rellenar(input, leerLugar(lugar));
    } catch (error) {
      poner(input, p.text.text);
      console.warn('[direcciones] No se pudieron leer los datos del lugar.', error);
    } finally {
      // Elegir cierra la sesion de facturacion: la siguiente busqueda abre otra.
      token = null;
    }
  };

  /* ---------------- Eventos (delegados: las paradas se crean despues) */

  const esCampo = (el: EventTarget | null): el is HTMLInputElement =>
    el instanceof HTMLInputElement && el.matches(SELECTOR);

  raiz.addEventListener('focusin', (e) => {
    if (esCampo(e.target)) void cargarPlaces().catch(() => (averiado = true));
  });

  raiz.addEventListener('input', (e) => {
    if (!esCampo(e.target) || !e.isTrusted) return;
    const input = e.target;
    window.clearTimeout(temporizador);
    temporizador = window.setTimeout(() => void buscar(input), ESPERA_MS);
  });

  raiz.addEventListener('keydown', (e) => {
    if (!esCampo(e.target) || !lista || e.target !== campo) return;
    const total = predicciones.length;
    if (e.key === 'ArrowDown' && total) {
      e.preventDefault();
      resaltar((activa + 1) % total);
    } else if (e.key === 'ArrowUp' && total) {
      e.preventDefault();
      resaltar((activa - 1 + total) % total);
    } else if (e.key === 'Enter' && activa >= 0) {
      e.preventDefault();
      void elegir(activa);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cerrar();
    }
  });

  raiz.addEventListener('focusout', (e) => {
    if (esCampo(e.target) && e.target === campo) cerrar();
  });

  /** Prepara los campos que existan (las paradas se crean al vuelo). */
  return () => {
    raiz.querySelectorAll<HTMLInputElement>(SELECTOR).forEach((input) => {
      if (input.dataset.cfBuscador) return;
      input.dataset.cfBuscador = '';
      input.setAttribute('role', 'combobox');
      input.setAttribute('aria-autocomplete', 'list');
      input.setAttribute('aria-expanded', 'false');
      input.setAttribute('autocomplete', 'off');
      input.placeholder = tx('logistica.direccionPlaceholder');
      input.closest('.cf-campo')?.classList.add('is-buscador');
    });
    raiz.querySelectorAll<HTMLElement>('[data-cf-dir-ayuda]').forEach((el) => (el.hidden = false));
  };
};
