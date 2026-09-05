import { asc, eq } from 'drizzle-orm';

import { Payment } from '../../domain/entities/payment.js';
import type { PaymentRepository } from '../../domain/ports/payment-repository.js';
import { payments } from '../database/schema/index.js';
import type { DrizzleExecutor } from './drizzle-executor.js';

export class DrizzlePaymentRepository implements PaymentRepository {
  constructor(private readonly db: DrizzleExecutor) {}

  async add(payment: Payment): Promise<void> {
    const snapshot = payment.toSnapshot();
    await this.db.insert(payments).values({
      id: snapshot.id,
      ticketId: snapshot.ticketId,
      amountCents: snapshot.amountMinorUnits,
      method: snapshot.method,
      note: snapshot.note,
      paidAt: snapshot.paidAt,
      createdBy: snapshot.createdBy,
    });
  }

  async findByTicket(ticketId: string): Promise<Payment[]> {
    const rows = await this.db.query.payments.findMany({
      where: eq(payments.ticketId, ticketId),
      orderBy: asc(payments.paidAt),
      with: { ticket: { with: { raffle: { columns: { currency: true } } } } },
    });

    return rows.map((row) =>
      Payment.restore({
        id: row.id,
        ticketId: row.ticketId,
        amountMinorUnits: row.amountCents,
        currency: row.ticket.raffle.currency,
        method: row.method,
        note: row.note,
        paidAt: row.paidAt,
        createdBy: row.createdBy,
      }),
    );
  }
}
