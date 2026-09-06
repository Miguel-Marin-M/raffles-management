import type { Raffle, RaffleStatus } from '../../domain/entities/raffle.js';

export interface PrizeView {
  readonly id: string;
  readonly position: number;
  readonly title: string;
  readonly description: string | null;
  readonly winningNumber: number | null;
}

export interface RaffleView {
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
  readonly prizes: readonly PrizeView[];
  readonly createdAt: string;
}

/**
 * Flattens a raffle into the shape the API returns.
 *
 * Dates are serialized here so controllers stay free of formatting decisions
 * and the domain never learns about transport concerns.
 */
export function toRaffleView(raffle: Raffle): RaffleView {
  return {
    id: raffle.id,
    name: raffle.name,
    description: raffle.description,
    ticketPriceMinorUnits: raffle.ticketPrice.minorUnits,
    currency: raffle.currency,
    numberMin: raffle.range.min,
    numberMax: raffle.range.max,
    numberDigits: raffle.range.digits,
    ticketCount: raffle.range.size,
    drawDate: raffle.drawDate?.toISOString() ?? null,
    lotteryReference: raffle.lotteryReference,
    status: raffle.status,
    prizes: raffle.prizes.map((prize) => ({
      id: prize.id,
      position: prize.position,
      title: prize.title,
      description: prize.description,
      winningNumber: prize.winningNumber,
    })),
    createdAt: raffle.createdAt.toISOString(),
  };
}
