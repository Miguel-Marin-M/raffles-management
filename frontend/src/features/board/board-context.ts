import { createContext } from 'react';

import type { BoardCell, CustomerInput, RaffleBoard, RaffleStatus } from '../../lib/rifas-api';

export interface BoardContextValue {
  readonly board: RaffleBoard;
  /** Refetches the board after any write. */
  reload: () => void;
  /** Set while a write is in flight, so panels can disable their actions. */
  readonly busy: boolean;
  /** Message for the last failed write, already translated. */
  readonly actionError: string | null;
  openCell: (cell: BoardCell) => void;
  markAsPaid: (numbers: readonly number[]) => void;
  release: (numbers: readonly number[]) => void;
  reassign: (numbers: readonly number[], customer: CustomerInput) => void;
  recordWinner: (prizeId: string, number: number | null) => void;
  changeStatus: (status: RaffleStatus) => void;
  editRaffle: () => void;
}

/**
 * Shared state of one raffle.
 *
 * The panels are separate routes now, so the board, its mutations and the
 * ticket sheet live in the layout above them instead of being passed down
 * through props that every route would have to forward.
 */
export const BoardContext = createContext<BoardContextValue | null>(null);
