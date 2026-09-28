/**
 * Largo del codigo de acceso al panel.
 *
 * Lo decide Supabase (*Authentication → Emails → Email OTP Length*), no
 * nosotros: aqui solo se replica para que las casillas, la validacion del
 * navegador y la del servidor digan los tres lo mismo. Si se cambia alla, hay
 * que cambiar este numero; si no, el formulario rechaza codigos buenos.
 *
 * Vive en src/data/ porque lo importan a la vez el servidor y el bundle del
 * navegador: es un dato puro, sin secretos ni SDK detras.
 */
export const LARGO_CODIGO = 8;

/** Un codigo pegado desde el correo puede traer espacios o guiones. */
export const limpiarCodigo = (valor: string) => valor.replace(/\D/g, '').slice(0, LARGO_CODIGO);

export const esCodigoValido = (valor: string) =>
  new RegExp(`^\\d{${LARGO_CODIGO}}$`).test(valor);
