import { useState, type FormEvent } from 'react';

import type { CreateRaffleInput, Raffle } from '../lib/raffles-api';

interface RaffleFormProps {
  readonly busy: boolean;
  readonly error: unknown;
  readonly onSubmit: (input: CreateRaffleInput) => void;
  /** When present the form edits that raffle instead of creating a new one. */
  readonly initial?: Raffle;
}

const RANGES = [
  { label: '00 – 99', min: 0, max: 99, digits: 2 },
  { label: '000 – 999', min: 0, max: 999, digits: 3 },
] as const;

/** Date input wants yyyy-mm-dd; the API speaks ISO timestamps. */
function toDateInput(iso: string | null | undefined): string {
  return iso == null ? '' : new Date(iso).toISOString().slice(0, 10);
}

/**
 * Raffle setup: price, range and the prize list.
 *
 * Prizes are a growing list of rows rather than a fixed set of fields, because
 * an organizer decides how many prizes the raffle has while filling the form.
 *
 * The number range only appears while creating: once boletas are out there,
 * moving the range would strand the numbers people already bought.
 */
export function RaffleForm({
  busy,
  error,
  onSubmit,
  initial,
}: RaffleFormProps): React.JSX.Element {
  const editing = initial !== undefined;

  const [name, setName] = useState(initial?.name ?? '');
  const [price, setPrice] = useState(
    initial === undefined ? '' : String(initial.ticketPriceMinorUnits),
  );
  const [rangeIndex, setRangeIndex] = useState(0);
  const [lottery, setLottery] = useState(initial?.lotteryReference ?? '');
  const [drawDate, setDrawDate] = useState(toDateInput(initial?.drawDate));
  const [prizes, setPrizes] = useState<string[]>(
    initial === undefined || initial.prizes.length === 0
      ? ['']
      : initial.prizes.map((prize) => prize.title),
  );

  const range = RANGES[rangeIndex] ?? RANGES[0];

  function submit(event: FormEvent): void {
    event.preventDefault();

    const common = {
      name,
      ticketPriceMinorUnits: Number(price),
      lotteryReference: lottery === '' ? null : lottery,
      drawDate: drawDate === '' ? null : new Date(`${drawDate}T12:00:00`).toISOString(),
      prizes: prizes
        .map((title) => title.trim())
        .filter((title) => title !== '')
        .map((title) => ({ title })),
    };

    onSubmit(
      editing
        ? common
        : {
            ...common,
            numberMin: range.min,
            numberMax: range.max,
            numberDigits: range.digits,
            status: 'active',
          },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="eyebrow">Nombre de la rifa</span>
        <input
          className="field"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
          placeholder="Rifa de la moto"
          required
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="eyebrow">Valor de la boleta</span>
        <input
          className="field numeric"
          type="number"
          inputMode="numeric"
          min={1}
          value={price}
          onChange={(event) => {
            setPrice(event.target.value);
          }}
          placeholder="10000"
          required
        />
        {editing ? (
          <span className="text-xs text-ink-soft">
            El valor nuevo aplica a lo que falta por cobrar.
          </span>
        ) : null}
      </label>

      {editing ? null : (
        <fieldset className="flex flex-col gap-1">
          <legend className="eyebrow">Números</legend>
          <div className="mt-1 flex gap-2">
            {RANGES.map((option, index) => (
              <button
                key={option.label}
                type="button"
                onClick={() => {
                  setRangeIndex(index);
                }}
                aria-pressed={rangeIndex === index}
                className={`numeric min-h-11 flex-1 border px-3 ${
                  rangeIndex === index
                    ? 'border-ink bg-ink text-sheet'
                    : 'border-rule bg-sheet'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="eyebrow">Juega con</span>
          <input
            className="field"
            value={lottery}
            onChange={(event) => {
              setLottery(event.target.value);
            }}
            placeholder="Lotería de Medellín"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="eyebrow">Fecha del sorteo</span>
          <input
            className="field"
            type="date"
            value={drawDate}
            onChange={(event) => {
              setDrawDate(event.target.value);
            }}
          />
        </label>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="eyebrow">Premios</legend>
        {prizes.map((prize, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="numeric w-6 shrink-0 text-center text-sm text-ink-soft">
              {index + 1}
            </span>
            <input
              className="field"
              value={prize}
              onChange={(event) => {
                setPrizes(prizes.map((item, at) => (at === index ? event.target.value : item)));
              }}
              placeholder={index === 0 ? 'Moto Bajaj Boxer' : 'Otro premio'}
            />
            {prizes.length > 1 ? (
              <button
                type="button"
                className="min-h-11 px-2 text-ink-soft"
                onClick={() => {
                  setPrizes(prizes.filter((_, at) => at !== index));
                }}
                aria-label={`Quitar premio ${index + 1}`}
              >
                ✕
              </button>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          className="self-start text-sm underline underline-offset-4"
          onClick={() => {
            setPrizes([...prizes, '']);
          }}
        >
          Añadir otro premio
        </button>
        {editing ? (
          <p className="text-xs text-ink-soft">
            Al guardar se reemplaza la lista completa de premios.
          </p>
        ) : null}
      </fieldset>

      {error !== null && error !== undefined ? (
        <p role="alert" className="border-l-2 border-stamp pl-3 text-sm text-stamp">
          No pudimos guardar la rifa. Revisa el nombre y el valor de la boleta.
        </p>
      ) : null}

      <button type="submit" className="btn" disabled={busy}>
        {busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear rifa'}
      </button>
    </form>
  );
}
