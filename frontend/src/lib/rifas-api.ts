import { request, setAccessToken, type Session } from './api';

export type RaffleStatus = 'draft' | 'active' | 'closed';
export type TicketStatus = 'reserved' | 'paid';
export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'other';

export interface Prize {
  readonly id: string;
  readonly position: number;
  readonly title: string;
  readonly description: string | null;
}

export interface Raffle {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly ticketPriceMinorUnits: number;
  readonly currency: string;
  readonly numberMin: number;
  readonly numberMax: number;
  readonly numberDigits: number;
  readonly ticketCount: number;
  readonly drawDate: string | null;
  readonly lotteryReference: string | null;
  readonly status: RaffleStatus;
  readonly prizes: readonly Prize[];
  readonly createdAt: string;
}

export interface BoardCell {
  readonly ticketId: string;
  readonly number: number;
  readonly label: string;
  readonly status: TicketStatus;
  readonly customerId: string;
  readonly customerName: string;
  readonly customerPhone: string | null;
  readonly amountPaidMinorUnits: number;
  readonly outstandingMinorUnits: number;
  readonly notes: string | null;
}

export interface BoardSummary {
  readonly totalNumbers: number;
  readonly freeNumbers: number;
  readonly reservedNumbers: number;
  readonly paidNumbers: number;
  readonly collectedMinorUnits: number;
  readonly pendingMinorUnits: number;
  readonly potentialMinorUnits: number;
}

export interface RaffleBoard {
  readonly raffle: Raffle;
  readonly takenCells: readonly BoardCell[];
  readonly summary: BoardSummary;
}

export interface PrizeInput {
  readonly title: string;
  readonly description?: string | null;
}

export interface CreateRaffleInput {
  readonly name: string;
  readonly description?: string | null;
  readonly ticketPriceMinorUnits: number;
  readonly numberMin?: number;
  readonly numberMax?: number;
  readonly numberDigits?: number;
  readonly drawDate?: string | null;
  readonly lotteryReference?: string | null;
  readonly prizes?: readonly PrizeInput[];
  readonly status?: RaffleStatus;
}

export interface Customer {
  readonly id: string;
  readonly name: string;
  readonly phone: string | null;
  readonly notes: string | null;
}

export type CustomerInput =
  | { readonly id: string }
  | { readonly name: string; readonly phone?: string | null };

export const api = {
  async login(email: string, password: string): Promise<Session> {
    const session = await request<Session>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    setAccessToken(session.accessToken);
    return session;
  },

  async register(name: string, email: string, password: string): Promise<Session> {
    const session = await request<Session>('/auth/register', {
      method: 'POST',
      body: { name, email, password },
    });
    setAccessToken(session.accessToken);
    return session;
  },

  async logout(): Promise<void> {
    await request<null>('/auth/logout', { method: 'POST' });
    setAccessToken(null);
  },

  me: () => request<Session['user']>('/auth/me'),

  searchCustomers: (term: string) =>
    request<Customer[]>(`/customers?q=${encodeURIComponent(term)}`),

  listRaffles: () => request<Raffle[]>('/raffles'),

  createRaffle: (input: CreateRaffleInput) =>
    request<Raffle>('/raffles', { method: 'POST', body: input }),

  updateRaffle: (raffleId: string, input: Partial<CreateRaffleInput>) =>
    request<Raffle>(`/raffles/${raffleId}`, { method: 'PATCH', body: input }),

  changeStatus: (raffleId: string, status: RaffleStatus) =>
    request<Raffle>(`/raffles/${raffleId}/status`, { method: 'PATCH', body: { status } }),

  getBoard: (raffleId: string) => request<RaffleBoard>(`/raffles/${raffleId}`),

  reserve: (raffleId: string, numbers: readonly number[], customer: CustomerInput) =>
    request<{ customerId: string; numbers: number[]; totalMinorUnits: number }>(
      `/raffles/${raffleId}/tickets/reserve`,
      { method: 'POST', body: { numbers, customer } },
    ),

  markAsPaid: (raffleId: string, numbers: readonly number[], method?: PaymentMethod) =>
    request<{ paidNumbers: number[]; collectedMinorUnits: number }>(
      `/raffles/${raffleId}/tickets/paid`,
      { method: 'POST', body: { numbers, method } },
    ),

  release: (raffleId: string, numbers: readonly number[]) =>
    request<{ releasedNumbers: number[] }>(`/raffles/${raffleId}/tickets/release`, {
      method: 'POST',
      body: { numbers },
    }),

  reassign: (ticketId: string, customer: CustomerInput) =>
    request<{ ticketId: string; number: number; customerId: string }>(
      `/tickets/${ticketId}/customer`,
      { method: 'PATCH', body: { customer } },
    ),

  registerPayment: (ticketId: string, amountMinorUnits: number, method?: PaymentMethod) =>
    request<{ ticketId: string; status: TicketStatus; outstandingMinorUnits: number }>(
      `/tickets/${ticketId}/payments`,
      { method: 'POST', body: { amountMinorUnits, method } },
    ),
};
