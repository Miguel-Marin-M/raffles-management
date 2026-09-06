import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Outlet, useParams } from '@tanstack/react-router';
import { useMemo, useState } from 'react';

import type { PhoneConflict } from '../../components/MergeCustomerDialog';
import { Sheet } from '../../components/Sheet';
import { BoardContext, type BoardContextValue } from '../../features/board/board-context';
import { ApiError } from '../../lib/api';
import { describeError } from '../../lib/errors';
import { formatMoney } from '../../lib/format';
import {
  api,
  type BoardCell,
  type CustomerInput,
  type RaffleBoard,
  type RaffleStatus,
} from '../../lib/raffles-api';
import { RaffleForm } from '../RaffleForm';
import { TicketDetail } from '../TicketDetail';

const TABS = [
  { to: 'board', label: 'Tablero' },
  { to: 'customers', label: 'Clientes' },
  { to: 'poster', label: 'Afiche' },
  { to: 'summary', label: 'Resumen' },
] as const;

/**
 * Everything shared by the four raffle sections: the board itself, the writes
 * that any of them can trigger, and the ticket sheet.
 *
 * Each section is its own URL, so the header, the totals and the tabs stay
 * mounted while only the panel below them changes.
 */
export function RaffleLayout(): React.JSX.Element {
  const { raffleId } = useParams({ from: '/raffles/$raffleId' });
  const queryClient = useQueryClient();
  const [openCell, setOpenCell] = useState<BoardCell | null>(null);
  const [editing, setEditing] = useState(false);
  const [phoneConflict, setPhoneConflict] = useState<PhoneConflict | null>(null);

  const board = useQuery({
    queryKey: ['board', raffleId],
    queryFn: () => api.getBoard(raffleId),
  });

  function reload(): void {
    void queryClient.invalidateQueries({ queryKey: ['board', raffleId] });
  }

  const markAsPaid = useMutation({
    mutationFn: (numbers: readonly number[]) => api.markAsPaid(raffleId, numbers),
    onSuccess: () => {
      setOpenCell(null);
      reload();
    },
  });

  const release = useMutation({
    mutationFn: (numbers: readonly number[]) => api.release(raffleId, numbers),
    onSuccess: () => {
      setOpenCell(null);
      reload();
    },
  });

  const reassign = useMutation({
    mutationFn: ({
      numbers,
      customer,
    }: {
      numbers: readonly number[];
      customer: CustomerInput;
    }) => api.reassign(raffleId, numbers, customer),
    onSuccess: () => {
      setOpenCell(null);
      setPhoneConflict(null);
      reload();
    },
    onError: (error: unknown, variables) => {
      const { customer } = variables;
      if (
        error instanceof ApiError &&
        error.body.code === 'DUPLICATE_CUSTOMER_PHONE' &&
        error.body.customerId !== undefined &&
        !('id' in customer)
      ) {
        setPhoneConflict({
          customerId: error.body.customerId,
          customerName: error.body.customerName ?? 'otro cliente',
          phone: customer.phone ?? '',
          typedName: customer.name,
        });
      }
    },
  });

  const registerPayment = useMutation({
    mutationFn: ({
      numbers,
      amountMinorUnits,
    }: {
      numbers: readonly number[];
      amountMinorUnits: number;
    }) => api.registerPayment(raffleId, numbers, amountMinorUnits),
    onSuccess: reload,
  });

  const recordWinners = useMutation({
    mutationFn: (winners: readonly { prizeId: string; number: number | null }[]) =>
      api.recordWinners(raffleId, winners),
    onSuccess: reload,
  });

  const changeStatus = useMutation({
    mutationFn: (status: RaffleStatus) => api.changeStatus(raffleId, status),
    onSuccess: reload,
  });

  const updateRaffle = useMutation({
    mutationFn: (input: Parameters<typeof api.updateRaffle>[1]) =>
      api.updateRaffle(raffleId, input),
    onSuccess: () => {
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: ['raffles'] });
      reload();
    },
  });

  const busy =
    markAsPaid.isPending ||
    release.isPending ||
    reassign.isPending ||
    registerPayment.isPending ||
    recordWinners.isPending ||
    changeStatus.isPending ||
    updateRaffle.isPending;

  // Only one write runs at a time, so they share a single message slot.
  const failure =
    markAsPaid.error ??
    release.error ??
    reassign.error ??
    registerPayment.error ??
    recordWinners.error ??
    changeStatus.error ??
    null;

  const value = useMemo<BoardContextValue | null>(() => {
    if (board.data === undefined) return null;

    return {
      board: board.data,
      reload,
      busy,
      actionError: failure === null ? null : describeError(failure),
      openCell: setOpenCell,
      markAsPaid: (numbers) => {
        markAsPaid.mutate(numbers);
      },
      release: (numbers) => {
        release.mutate(numbers);
      },
      reassign: (numbers, customer) => {
        reassign.mutate({ numbers, customer });
      },
      registerPayment: (numbers, amountMinorUnits) => {
        registerPayment.mutate({ numbers, amountMinorUnits });
      },
      phoneConflict,
      resolvePhoneConflict: setPhoneConflict,
      recordWinners: (winners) => {
        recordWinners.mutate(winners);
      },
      changeStatus: (status) => {
        changeStatus.mutate(status);
      },
      editRaffle: () => {
        setEditing(true);
      },
      readOnly: board.data.raffle.status === 'closed',
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.data, busy, failure, phoneConflict]);

  if (board.isPending) return <p className="px-4 py-10 text-ink-soft">Cargando tablero…</p>;
  if (value === null) {
    return <p className="px-4 py-10 text-stamp">No pudimos cargar la rifa.</p>;
  }

  const { raffle } = value.board;

  return (
    <BoardContext value={value}>
      <main className="mx-auto w-full max-w-2xl px-4 pb-32 pt-5">
        <Link to="/raffles" className="eyebrow mb-4 inline-flex min-h-11 items-center">
          ← Tus rifas
        </Link>

        <RaffleHeader board={value.board} />

        <nav className="mb-5 flex border border-rule" aria-label="Secciones de la rifa">
          {TABS.map((tab) => (
            <Link
              key={tab.to}
              to={`/raffles/$raffleId/${tab.to}`}
              params={{ raffleId }}
              className="min-h-11 flex-1 content-center text-center font-display text-sm font-semibold text-ink-soft"
              activeProps={{ className: 'bg-ink text-sheet' }}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        {value.actionError !== null ? (
          <p role="alert" className="mb-4 border-l-2 border-stamp pl-3 text-sm text-stamp">
            {value.actionError}
          </p>
        ) : null}

        <Outlet />

        <Sheet
          open={openCell !== null && !value.readOnly}
          title={openCell === null ? '' : `Boleta ${openCell.label}`}
          onClose={() => {
            setOpenCell(null);
          }}
        >
          {openCell === null ? null : (
            <TicketDetail
              cell={openCell}
              raffleId={raffleId}
              currency={raffle.currency}
              busy={busy}
              onMarkAsPaid={() => {
                markAsPaid.mutate([openCell.number]);
              }}
              onRelease={() => {
                release.mutate([openCell.number]);
              }}
              onReassign={(customer) => {
                reassign.mutate({ numbers: [openCell.number], customer });
              }}
              onChanged={() => {
                setOpenCell(null);
                reload();
              }}
            />
          )}
        </Sheet>

        <Sheet
          open={editing}
          title="Editar rifa"
          onClose={() => {
            setEditing(false);
          }}
        >
          <RaffleForm
            initial={raffle}
            busy={updateRaffle.isPending}
            error={updateRaffle.error}
            onSubmit={(input) => {
              updateRaffle.mutate(input);
            }}
          />
        </Sheet>
      </main>
    </BoardContext>
  );
}

function RaffleHeader({ board }: { board: RaffleBoard }): React.JSX.Element {
  const { raffle, summary } = board;
  const sold = summary.totalNumbers - summary.freeNumbers;
  const progress = summary.totalNumbers === 0 ? 0 : sold / summary.totalNumbers;

  return (
    <header className="mb-5">
      <h1 className="text-3xl leading-none" style={{ fontStretch: '116%' }}>
        {raffle.name}
      </h1>
      <p className="numeric mt-1 text-sm text-ink-soft">
        {formatMoney(raffle.ticketPriceMinorUnits, raffle.currency)} la boleta
        {raffle.lotteryReference === null ? '' : ` · juega con ${raffle.lotteryReference}`}
        {raffle.status === 'closed' ? ' · cerrada' : ''}
      </p>

      <div className="mt-4 h-2 w-full border border-rule bg-sheet" aria-hidden="true">
        <div className="h-full bg-ink" style={{ width: `${(progress * 100).toFixed(1)}%` }} />
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-3">
        <Stat label="Vendidas" value={`${sold}/${summary.totalNumbers}`} />
        <Stat
          label="Recaudado"
          value={formatMoney(summary.collectedMinorUnits, raffle.currency)}
          tone="paid"
        />
        <Stat
          label="Por cobrar"
          value={formatMoney(summary.pendingMinorUnits, raffle.currency)}
          tone="stamp"
        />
      </dl>
    </header>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'stamp' | 'paid';
}): React.JSX.Element {
  return (
    <div className="border-t border-ink pt-2">
      <dt className="eyebrow">{label}</dt>
      <dd
        className={`numeric text-base ${
          tone === 'stamp' ? 'text-stamp' : tone === 'paid' ? 'text-paid' : ''
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
