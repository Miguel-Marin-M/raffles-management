import { useBoard } from '../../features/board/use-board';
import { SummaryPanel } from '../SummaryPanel';

export function SummaryTab(): React.JSX.Element {
  const { board, busy, changeStatus, recordWinners, editRaffle, readOnly } = useBoard();

  return (
    <SummaryPanel
      board={board}
      busy={busy}
      onChangeStatus={changeStatus}
      onEdit={editRaffle}
      onRecordWinners={recordWinners}
      readOnly={readOnly}
    />
  );
}
