import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { NumberGrid } from '../components/NumberGrid';
import { Sheet } from '../components/Sheet';
import { ApiError } from '../lib/api';
import { formatMoney } from '../lib/format';
import { api, type BoardCell, type RaffleBoard, type RaffleStatus } from '../lib/rifas-api';
import { CustomersPanel } from './CustomersPanel';
import { Poster } from './PosterPanel';
import { ReserveForm } from './ReserveForm';
import { SummaryPanel } from './SummaryPanel';
import { TicketDetail } from './TicketDetail';

interface BoardScreenProps {
  readonly raffleId: string;
  readonly onBack: () => void;
}

type Panel = 'tablero' | 'clientes' | 'afiche' | 'resumen';

const PANELS: readonly { id: Panel; label: string }[] = [
  { id: 'tablero', label: 'Tablero' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'afiche', label: 'Afiche' },
  { id: 'resumen', label: 'Resumen' },
];

/**
 * The screen the organizer lives in: the whole board, what is selected right
 * now, and how much money the raffle has moved.
 */
export function BoardScreen({ raffleId, onBack }: BoardScreenProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const [panel, setPanel] = useState<Panel>('tablero');
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const [reserving, setReserving] = useState(false);
  const [openCell, setOpenCell] = useState<BoardCell | null>(null);
  const [conflict, setConflict] = useState<readonly number[] | null>(null);
  const [posterFullscreen, setPosterFullscreen] = useState(false);

  const board = useQuery({
    queryKey: ['board', raffleId],
    queryFn: () => api.getBoard(raffleId),
  });

  const takenByNumber = useMemo(
    () => new Map((board.data?.takenCells ?? []).map((cell) => [cell.number, cell])),
    [board.data],
  );

  async function reload(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: ['board', raffleId] });
  }

  const reserve = useMutation({
    mutationFn: (input: Parameters<typeof api.reserve>[2]) =>
      api.reserve(raffleId, [...selected], input),
    onSuccess: async () => {
      setReserving(false);
      setSelected(new Set());
      await reload();
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.body.numbers !== undefined) {
        setConflict(error.body.numbers);
        setReserving(false);
        void reload();
      }
    },
  });

  const markAsPaid = useMutation({
    mutationFn: (numbers: readonly number[]) => api.markAsPaid(raffleId, numbers),
    onSuccess: async () => {
      setSelected(new Set());
      setOpenCell(null);
      await reload();
    },
  });

  const release = useMutation({
    mutationFn: (numbers: readonly number[]) => api.release(raffleId, numbers),
    onSuccess: async () => {
      setSelected(new Set());
      setOpenCell(null);
      await reload();
    },
  });

  const changeStatus = useMutation({
    mutationFn: (status: RaffleStatus) => api.changeStatus(raffleId, status),
    onSuccess: reload,
  });

  function toggle(value: number): void {
    const cell = takenByNumber.get(value);
    // Tapping a taken number opens it; only free numbers join a selection.
    if (cell !== undefined) {
      setOpenCell(cell);
      return;
    }

    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setSelected(next);
    setConflict(null);
  }

  if (board.isPending) return <p className="px-4 py-10 text-tinta-suave">Cargando tablero…</p>;
  if (board.data === undefined) {
    return <p className="px-4 py-10 text-sello">No pudimos cargar la rifa.</p>;
  }

  const { raffle, summary } = board.data;
  const selectionTotal = selected.size * raffle.ticketPriceMinorUnits;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-32 pt-5">
      <button
        type="button"
        onClick={onBack}
        className="rotulo mb-4 inline-flex min-h-11 items-center"
      >
        ← Tus rifas
      </button>

      <BoardHeader board={board.data} />

      <nav className="mb-5 flex border border-linea" aria-label="Secciones de la rifa">
        {PANELS.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-current={panel === option.id}
            onClick={() => {
              setPanel(option.id);
            }}
            className={`min-h-11 flex-1 font-display text-sm font-semibold ${
              panel === option.id ? 'bg-tinta text-papel-alto' : 'text-tinta-suave'
            }`}
          >
            {option.label}
          </button>
        ))}
      </nav>

      {conflict !== null ? (
        <p role="alert" className="mb-4 border-l-2 border-sello pl-3 text-sm text-sello">
          {conflict.length === 1
            ? `El ${String(conflict[0]).padStart(raffle.numberDigits, '0')} lo apartaron primero.`
            : `Estos números ya estaban apartados: ${conflict
                .map((value) => String(value).padStart(raffle.numberDigits, '0'))
                .join(', ')}.`}{' '}
          Ya actualizamos el tablero.
        </p>
      ) : null}

      {panel === 'tablero' ? (
        <>
          <NumberGrid
            raffle={raffle}
            takenCells={board.data.takenCells}
            selected={selected}
            onToggle={toggle}
          />
          <Legend />
        </>
      ) : null}

      {panel === 'clientes' ? (
        <CustomersPanel
          raffle={raffle}
          takenCells={board.data.takenCells}
          busy={markAsPaid.isPending}
          onOpenCell={setOpenCell}
          onMarkAsPaid={(numbers) => {
            markAsPaid.mutate(numbers);
          }}
          onCustomerChanged={() => void reload()}
        />
      ) : null}

      {panel === 'afiche' ? (
        <section className="flex flex-col gap-3">
          <p className="text-sm text-tinta-suave">
            Así ven la rifa tus clientes. Ábrelo en pantalla completa y tómale una captura para
            mandarlo por WhatsApp.
          </p>
          <div className="border border-linea">
            <Poster board={board.data} />
          </div>
          <button
            type="button"
            className="boton"
            onClick={() => {
              setPosterFullscreen(true);
            }}
          >
            Ver en pantalla completa
          </button>
        </section>
      ) : null}

      {panel === 'resumen' ? (
        <SummaryPanel
          board={board.data}
          busy={changeStatus.isPending}
          onChangeStatus={(status) => {
            changeStatus.mutate(status);
          }}
        />
      ) : null}

      {selected.size > 0 ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-tinta bg-papel-alto px-4 py-3">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="cifra text-sm">
                {selected.size} {selected.size === 1 ? 'boleta' : 'boletas'} ·{' '}
                {formatMoney(selectionTotal, raffle.currency)}
              </p>
              <button
                type="button"
                className="text-xs text-tinta-suave underline underline-offset-4"
                onClick={() => {
                  setSelected(new Set());
                }}
              >
                Quitar selección
              </button>
            </div>
            <button
              type="button"
              className="boton"
              onClick={() => {
                setReserving(true);
              }}
            >
              Apartar
            </button>
          </div>
        </div>
      ) : null}

      <Sheet
        open={reserving}
        title={`Apartar ${selected.size} ${selected.size === 1 ? 'boleta' : 'boletas'}`}
        onClose={() => {
          setReserving(false);
        }}
      >
        <ReserveForm
          numbers={[...selected].sort((a, b) => a - b)}
          digits={raffle.numberDigits}
          total={formatMoney(selectionTotal, raffle.currency)}
          busy={reserve.isPending}
          onSubmit={(customer) => {
            reserve.mutate(customer);
          }}
        />
      </Sheet>

      <Sheet
        open={openCell !== null}
        title={openCell === null ? '' : `Boleta ${openCell.label}`}
        onClose={() => {
          setOpenCell(null);
        }}
      >
        {openCell === null ? null : (
          <TicketDetail
            cell={openCell}
            currency={raffle.currency}
            ticketPriceMinorUnits={raffle.ticketPriceMinorUnits}
            busy={markAsPaid.isPending || release.isPending}
            onMarkAsPaid={() => {
              markAsPaid.mutate([openCell.number]);
            }}
            onRelease={() => {
              release.mutate([openCell.number]);
            }}
            onChanged={() => {
              setOpenCell(null);
              void reload();
            }}
          />
        )}
      </Sheet>

      {posterFullscreen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-papel">
          {/* Kept out of the poster frame so it never lands in the screenshot. */}
          <div className="flex justify-end px-4 py-2">
            <button
              type="button"
              className="min-h-11 text-sm underline underline-offset-4"
              onClick={() => {
                setPosterFullscreen(false);
              }}
            >
              Cerrar
            </button>
          </div>
          <Poster board={board.data} />
        </div>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {summary.freeNumbers} números libres de {summary.totalNumbers}.
      </p>
    </main>
  );
}

function BoardHeader({ board }: { board: RaffleBoard }): React.JSX.Element {
  const { raffle, summary } = board;
  const sold = summary.totalNumbers - summary.freeNumbers;
  const progress = summary.totalNumbers === 0 ? 0 : sold / summary.totalNumbers;

  return (
    <header className="mb-5">
      <h1 className="text-3xl leading-none" style={{ fontStretch: '116%' }}>
        {raffle.name}
      </h1>
      <p className="cifra mt-1 text-sm text-tinta-suave">
        {formatMoney(raffle.ticketPriceMinorUnits, raffle.currency)} la boleta
        {raffle.lotteryReference === null ? '' : ` · juega con ${raffle.lotteryReference}`}
        {raffle.status === 'closed' ? ' · cerrada' : ''}
      </p>

      <div className="mt-4 h-2 w-full border border-linea bg-papel-alto" aria-hidden="true">
        <div className="h-full bg-tinta" style={{ width: `${(progress * 100).toFixed(1)}%` }} />
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-3">
        <Stat label="Vendidas" value={`${sold}/${summary.totalNumbers}`} />
        <Stat
          label="Recaudado"
          value={formatMoney(summary.collectedMinorUnits, raffle.currency)}
          tone="cancelado"
        />
        <Stat
          label="Por cobrar"
          value={formatMoney(summary.pendingMinorUnits, raffle.currency)}
          tone="sello"
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
  tone?: 'sello' | 'cancelado';
}): React.JSX.Element {
  return (
    <div className="border-t border-tinta pt-2">
      <dt className="rotulo">{label}</dt>
      <dd
        className={`cifra text-base ${
          tone === 'sello' ? 'text-sello' : tone === 'cancelado' ? 'text-cancelado' : ''
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function Legend(): React.JSX.Element {
  return (
    <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-tinta-suave">
      <li className="flex items-center gap-2">
        <span className="h-3 w-3 border border-linea bg-papel-alto" aria-hidden="true" />
        Libre
      </li>
      <li className="flex items-center gap-2">
        <span className="h-3 w-3 border border-sello bg-sello/12" aria-hidden="true" />
        Apartada
      </li>
      <li className="flex items-center gap-2">
        <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
          <rect width="12" height="12" fill="none" stroke="var(--color-linea)" />
          <path d="M2 10 L10 2" stroke="var(--color-cancelado)" strokeWidth="1.6" />
        </svg>
        Pagada
      </li>
    </ul>
  );
}
