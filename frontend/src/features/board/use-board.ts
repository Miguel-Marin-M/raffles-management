import { use } from 'react';

import { BoardContext, type BoardContextValue } from './board-context';

export function useBoard(): BoardContextValue {
  const value = use(BoardContext);
  if (value === null) throw new Error('useBoard must be used inside the raffle layout');
  return value;
}
