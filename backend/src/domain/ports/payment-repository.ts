import type { Payment } from '../entities/payment.js';

export interface PaymentRepository {
  add(payment: Payment): Promise<void>;
  findByTicket(ticketId: string): Promise<Payment[]>;
}

export const PAYMENT_REPOSITORY = Symbol('PaymentRepository');
