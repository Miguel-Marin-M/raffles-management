import { useState } from 'react';

import { ConfirmDialog } from '../components/ConfirmDialog';
import { PrizeWinner } from '../components/PrizeWinner';
import { downloadCsv } from '../lib/csv';
import { formatDate, formatMoney } from '../lib/format';
import type { RaffleBoard, RaffleStatus } from '../lib/rifas-api';

interface SummaryPanelProps {
  readonly board: RaffleBoard;
  readonly onChangeStatus: (status: RaffleStatus) => void;
  readonly onEdit: () => void;
  readonly onRecordWinner: (prizeId: string, number: number | null) => void;
  readonly busy: boolean;
}

/** Prizes, money and the paperwork: what the organizer reports to buyers. */
export function SummaryPanel({
  board,
  onChangeStatus,
  onEdit,
  onRecordWinner,
  busy,
}: SummaryPanelProps): React.JSX.Element {
  const [closing, setClosing] = useState(false);
  const { raffle, summary, takenCells } = board;
  const drawDate = formatDate(raffle.drawDate);

  function exportCsv(): void {
    downloadCsv(
      `${raffle.name.replace(/\s+/g, '-').toLowerCase()}-boletas.csv`,
      ['numero', 'estado', 'cliente', 'telefono', 'abonado', 'debe'],
      [...takenCells]
        .sort((a, b) => a.number - b.number)
        .map((cell) => [
          cell.label,
          cell.status === 'paid' ? 'pagada' : 'apartada',
          cell.customerName,
          cell.customerPhone ?? '',
          String(cell.amountPaidMinorUnits),
          String(cell.outstandingMinorUnits),
        ]),
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="eyebrow">Premios</h3>
        {raffle.prizes.length === 0 ? (
          <p className="mt-2 text-ink-soft">Esta rifa todavía no tiene premios cargados.</p>
        ) : (
          <ol className="mt-2 flex flex-col">
            {raffle.prizes.map((prize) => (
              <li
                key={prize.id}
                className="flex items-baseline gap-3 border-b border-rule py-2 last:border-b-0"
              >
                <span className="numeric w-6 shrink-0 text-sm text-lottery">{prize.position}</span>
                <div className="flex flex-1 flex-col items-start">
                  <span>{prize.title}</span>
                  <PrizeWinner
                    raffle={raffle}
                    prize={prize}
                    takenCells={takenCells}
                    busy={busy}
                    onRecord={onRecordWinner}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h3 className="eyebrow">Cuentas</h3>
        <dl className="mt-2 flex flex-col">
          <Row label="Boletas vendidas" value={`${summary.totalNumbers - summary.freeNumbers} de ${summary.totalNumbers}`} />
          <Row label="Pagadas" value={String(summary.paidNumbers)} />
          <Row label="Apartadas sin pagar" value={String(summary.reservedNumbers)} />
          <Row
            label="Recaudado"
            value={formatMoney(summary.collectedMinorUnits, raffle.currency)}
          />
          <Row
            label="Por cobrar"
            value={formatMoney(summary.pendingMinorUnits, raffle.currency)}
          />
          <Row
            label="Si se vende todo"
            value={formatMoney(summary.potentialMinorUnits, raffle.currency)}
          />
        </dl>
      </section>

      <section>
        <h3 className="eyebrow">Sorteo</h3>
        <p className="mt-2">
          {drawDate ?? 'Sin fecha definida'}
          {raffle.lotteryReference === null ? '' : ` · ${raffle.lotteryReference}`}
        </p>
      </section>

      <div className="flex flex-col gap-2">
        <button type="button" className="btn" onClick={onEdit}>
          Editar rifa y premios
        </button>

        <button type="button" className="btn btn-secondary" onClick={exportCsv}>
          Descargar boletas en CSV
        </button>

        {raffle.status === 'closed' ? (
          <p className="border-l-2 border-ink pl-3 text-sm">
            Esta rifa está cerrada y guardada en el historial. Su tablero queda como registro y
            no se puede reabrir.
          </p>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => {
                setClosing(true);
              }}
            >
              Cerrar la rifa
            </button>
            <p className="text-xs text-ink-soft">
              Al cerrarla pasa al historial: el tablero queda como registro y ya no se pueden
              apartar ni cobrar boletas.
            </p>
          </>
        )}
      </div>

      <ConfirmDialog
        open={closing}
        title={`Cerrar ${raffle.name}`}
        confirmLabel="Sí, cerrarla"
        busy={busy}
        onCancel={() => {
          setClosing(false);
        }}
        onConfirm={() => {
          setClosing(false);
          onChangeStatus('closed');
        }}
      >
        <p>
          La rifa pasa al historial y su tablero queda como registro: no se podrán apartar,
          cobrar ni liberar más boletas.
        </p>
        {summary.reservedNumbers > 0 ? (
          <p className="mt-2 text-stamp">
            Quedan {summary.reservedNumbers} boletas apartadas sin pagar, por{' '}
            {formatMoney(summary.pendingMinorUnits, raffle.currency)}.
          </p>
        ) : null}
        <p className="mt-2 text-ink-soft">
          Una rifa cerrada no se puede reabrir. Esto no se puede deshacer.
        </p>
      </ConfirmDialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-rule py-2 last:border-b-0">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="numeric">{value}</dd>
    </div>
  );
}
