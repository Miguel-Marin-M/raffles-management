import type {
  TicketEvent,
  TicketEventRecorder,
} from '../../domain/ports/ticket-event-recorder.js';
import { ticketEvents } from '../database/schema/index.js';
import type { DrizzleExecutor } from './drizzle-executor.js';

export class DrizzleTicketEventRecorder implements TicketEventRecorder {
  constructor(private readonly db: DrizzleExecutor) {}

  async record(events: readonly TicketEvent[]): Promise<void> {
    if (events.length === 0) return;

    await this.db.insert(ticketEvents).values(
      events.map((event) => ({
        raffleId: event.raffleId,
        number: event.number,
        type: event.type,
        actorId: event.actorId,
        payload: event.payload,
      })),
    );
  }
}
