import { ApiError } from './api';

/**
 * What each backend error code means to the organizer.
 *
 * Messages are keyed by code rather than matched on text, so the wording can
 * change on either side without breaking the other.
 */
const MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: 'Tu sesión venció. Entra otra vez.',
  INVALID_CREDENTIALS: 'El correo o la contraseña no coinciden.',
  EMAIL_ALREADY_REGISTERED: 'Ese correo ya tiene cuenta. Entra con tu contraseña.',
  VALIDATION_ERROR: 'Revisa los datos: hay algo que no cuadra.',
  RAFFLE_NOT_FOUND: 'Esa rifa ya no existe.',
  RAFFLE_CLOSED: 'La rifa está cerrada. Reábrela para seguir moviendo boletas.',
  INVALID_PRIZE_LIST: 'Revisa la lista de premios.',
  CUSTOMER_NOT_FOUND: 'No encontramos ese cliente.',
  DUPLICATE_CUSTOMER_PHONE: 'Ese teléfono ya está en la ficha de otro cliente.',
  TICKET_NOT_FOUND: 'Esa boleta ya no existe.',
  TICKETS_ALREADY_TAKEN: 'Alguien se adelantó con esos números.',
  TICKET_NUMBERS_NOT_RESERVED: 'Esos números no están apartados.',
  TICKET_NUMBERS_OUT_OF_RANGE: 'Ese número no existe en esta rifa.',
  TICKET_ALREADY_PAID: 'Esa boleta ya está pagada.',
  TICKET_HAS_PAYMENTS: 'No se puede liberar una boleta con abonos: primero devuelve el dinero.',
  PAID_TICKET_IS_FINAL: 'Una boleta pagada no se puede liberar ni pasar a otro cliente.',
  PAYMENT_EXCEEDS_OUTSTANDING: 'El abono es mayor a lo que falta por pagar.',
};

export function describeError(cause: unknown): string {
  if (cause instanceof ApiError) return MESSAGES[cause.body.code] ?? cause.body.message;
  return 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo otra vez.';
}
