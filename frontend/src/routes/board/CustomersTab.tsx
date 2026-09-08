import { useNavigate, useSearch } from '@tanstack/react-router';

import { useBoard } from '../../features/board/use-board';
import { CustomersPanel } from '../CustomersPanel';

const ROUTE = '/raffles/$raffleId/customers' as const;

export function CustomersTab(): React.JSX.Element {
  const {
    board,
    busy,
    openCell,
    markAsPaid,
    release,
    reassign,
    registerPayment,
    reload,
    phoneConflict,
    resolvePhoneConflict,
    readOnly,
  } = useBoard();

  const { page = 1, q = '' } = useSearch({ from: ROUTE });
  const navigate = useNavigate({ from: ROUTE });

  return (
    <CustomersPanel
      raffle={board.raffle}
      takenCells={board.takenCells}
      busy={busy}
      query={q}
      page={page}
      onQueryChange={(next) => {
        // Dropping `page` restarts at the first result, and replacing keeps one
        // history entry instead of one per keystroke.
        void navigate({ search: next.trim() === '' ? {} : { q: next }, replace: true });
      }}
      onPageChange={(next) => {
        void navigate({ search: (previous) => ({ ...previous, page: next }) });
      }}
      onOpenCell={openCell}
      onMarkAsPaid={markAsPaid}
      onRelease={release}
      onReassign={reassign}
      onRegisterPayment={registerPayment}
      onCustomerChanged={reload}
      phoneConflict={phoneConflict}
      onResolveConflict={resolvePhoneConflict}
      readOnly={readOnly}
    />
  );
}
