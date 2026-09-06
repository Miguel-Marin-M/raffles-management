import { formatDate, formatMoney } from '../lib/format';
import { downloadCsv } from '../lib/csv';
import type { RaffleBoard, RaffleStatus } from '../lib/rifas-api';

interface SummaryPanelProps {
  readonly board: RaffleBoard;
  readonly onChangeStatus: (status: RaffleStatus) => void;
  readonly busy: boolean;
}

/** Prizes, money and the paperwork: what the organizer reports to buyers. */
export function SummaryPanel({ board, onChangeStatus, busy }: SummaryPanelProps): React.JSX.Element {
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
        <h3 className="rotulo">Premios</h3>
        {raffle.prizes.length === 0 ? (
          <p className="mt-2 text-tinta-suave">Esta rifa todavía no tiene premios cargados.</p>
        ) : (
          <ol className="mt-2 flex flex-col">
            {raffle.prizes.map((prize) => (
              <li
                key={prize.id}
                className="flex items-baseline gap-3 border-b border-linea py-2 last:border-b-0"
              >
                <span className="cifra w-6 shrink-0 text-sm text-loteria">{prize.position}</span>
                <span className="flex-1">{prize.title}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h3 className="rotulo">Cuentas</h3>
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
        <h3 className="rotulo">Sorteo</h3>
        <p className="mt-2">
          {drawDate ?? 'Sin fecha definida'}
          {raffle.lotteryReference === null ? '' : ` · ${raffle.lotteryReference}`}
        </p>
      </section>

      <div className="flex flex-col gap-2">
        <button type="button" className="boton boton-secundario" onClick={exportCsv}>
          Descargar boletas en CSV
        </button>

        {raffle.status === 'closed' ? (
          <button
            type="button"
            className="boton boton-secundario"
            disabled={busy}
            onClick={() => {
              onChangeStatus('active');
            }}
          >
            Reabrir la rifa
          </button>
        ) : (
          <button
            type="button"
            className="boton boton-secundario"
            disabled={busy}
            onClick={() => {
              onChangeStatus('closed');
            }}
          >
            Cerrar la rifa
          </button>
        )}
        <p className="text-xs text-tinta-suave">
          Al cerrarla, el tablero queda como registro y ya no se pueden apartar ni cobrar
          boletas.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-linea py-2 last:border-b-0">
      <dt className="text-tinta-suave">{label}</dt>
      <dd className="cifra">{value}</dd>
    </div>
  );
}
