import { useBoard } from '../../features/board/use-board';
import { CustomersPanel } from '../CustomersPanel';

export function CustomersTab(): React.JSX.Element {
  const { board, busy, openCell, markAsPaid, reload } = useBoard();

  return (
    <CustomersPanel
      raffle={board.raffle}
      takenCells={board.takenCells}
      busy={busy}
      onOpenCell={openCell}
      onMarkAsPaid={markAsPaid}
      onCustomerChanged={reload}
    />
  );
}
