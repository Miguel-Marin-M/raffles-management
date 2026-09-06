import { useBoard } from '../../features/board/use-board';
import { CustomersPanel } from '../CustomersPanel';

export function CustomersTab(): React.JSX.Element {
  const { board, busy, openCell, markAsPaid, release, reassign, reload } = useBoard();

  return (
    <CustomersPanel
      raffle={board.raffle}
      takenCells={board.takenCells}
      busy={busy}
      onOpenCell={openCell}
      onMarkAsPaid={markAsPaid}
      onRelease={release}
      onReassign={reassign}
      onCustomerChanged={reload}
    />
  );
}
