export type TicketEventType =
  | 'reserved'
  | 'payment_registered'
  | 'paid'
  | 'released'
  | 'reassigned'
  | 'updated';

export interface TicketEvent {
  readonly raffleId: string;
  readonly number: number;
  readonly type: TicketEventType;
  readonly actorId: string | null;
  readonly payload: Readonly<Record<string, unknown>>;
}

/** Append-only audit trail; it outlives the tickets it describes. */
export interface TicketEventRecorder {
  record(events: readonly TicketEvent[]): Promise<void>;
}

export const TICKET_EVENT_RECORDER = Symbol('TicketEventRecorder');
