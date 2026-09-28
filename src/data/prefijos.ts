/**
 * Prefijos telefonicos del selector de los formularios.
 *
 * Modulo PURO: lo usan el navegador (para pintar el <select>) y
 * /api/presupuesto (para comprobar que el prefijo recibido es uno de estos
 * antes de meterlo en el correo). No puede tocar la base de datos ni secretos.
 *
 * Lista corta a proposito. Un food truck de Valencia no necesita los ~240
 * prefijos del mundo en el bundle de cada pagina con formulario; estan Espana,
 * los paises vecinos y los que concentran el resto de consultas. Si algun dia
 * hace falta uno mas, se anade aqui y aparece en los tres formularios.
 *
 * Espana va primera porque es la opcion por defecto del <select>.
 */
export type Prefijo = {
  /** ISO 3166-1 alpha-2, solo para la bandera y la clave. */
  pais: string;
  /** Con el `+` incluido: es tal cual como acaba en el correo. */
  prefijo: string;
  nombre: string;
};

export const PREFIJOS: readonly Prefijo[] = [
  { pais: 'ES', prefijo: '+34', nombre: 'España' },
  { pais: 'PT', prefijo: '+351', nombre: 'Portugal' },
  { pais: 'FR', prefijo: '+33', nombre: 'Francia' },
  { pais: 'IT', prefijo: '+39', nombre: 'Italia' },
  { pais: 'DE', prefijo: '+49', nombre: 'Alemania' },
  { pais: 'GB', prefijo: '+44', nombre: 'Reino Unido' },
  { pais: 'IE', prefijo: '+353', nombre: 'Irlanda' },
  { pais: 'NL', prefijo: '+31', nombre: 'Países Bajos' },
  { pais: 'BE', prefijo: '+32', nombre: 'Bélgica' },
  { pais: 'CH', prefijo: '+41', nombre: 'Suiza' },
  { pais: 'AT', prefijo: '+43', nombre: 'Austria' },
  { pais: 'US', prefijo: '+1', nombre: 'EE. UU. / Canadá' },
  { pais: 'MX', prefijo: '+52', nombre: 'México' },
  { pais: 'AR', prefijo: '+54', nombre: 'Argentina' },
  { pais: 'MA', prefijo: '+212', nombre: 'Marruecos' },
];

/** Prefijo preseleccionado en los formularios. */
export const PREFIJO_POR_DEFECTO = '+34';

/**
 * El prefijo llega del navegador y acaba en el correo, asi que se comprueba
 * contra la lista en vez de copiarlo tal cual. Mismo criterio que isConfigId()
 * en src/data/config-ids.ts.
 */
export const esPrefijoValido = (valor: string) =>
  PREFIJOS.some((entrada) => entrada.prefijo === valor);
