import { useState, type FormEvent } from 'react';

import type { CreateRaffleInput } from '../lib/rifas-api';

interface RaffleFormProps {
  readonly busy: boolean;
  readonly error: unknown;
  readonly onSubmit: (input: CreateRaffleInput) => void;
}

const RANGES = [
  { label: '00 – 99', min: 0, max: 99, digits: 2 },
  { label: '000 – 999', min: 0, max: 999, digits: 3 },
] as const;

/**
 * Raffle setup: price, range and the prize list.
 *
 * Prizes are a growing list of rows rather than a fixed set of fields, because
 * an organizer decides how many prizes the raffle has while filling the form.
 */
export function RaffleForm({ busy, error, onSubmit }: RaffleFormProps): React.JSX.Element {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [rangeIndex, setRangeIndex] = useState(0);
  const [lottery, setLottery] = useState('');
  const [drawDate, setDrawDate] = useState('');
  const [prizes, setPrizes] = useState<string[]>(['']);

  const range = RANGES[rangeIndex] ?? RANGES[0];

  function submit(event: FormEvent): void {
    event.preventDefault();

    onSubmit({
      name,
      ticketPriceMinorUnits: Number(price),
      numberMin: range.min,
      numberMax: range.max,
      numberDigits: range.digits,
      lotteryReference: lottery === '' ? null : lottery,
      drawDate: drawDate === '' ? null : new Date(`${drawDate}T12:00:00`).toISOString(),
      prizes: prizes
        .map((title) => title.trim())
        .filter((title) => title !== '')
        .map((title) => ({ title })),
      status: 'active',
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="rotulo">Nombre de la rifa</span>
        <input
          className="campo"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
          placeholder="Rifa de la moto"
          required
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="rotulo">Valor de la boleta</span>
        <input
          className="campo cifra"
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
      </label>

      <fieldset className="flex flex-col gap-1">
        <legend className="rotulo">Números</legend>
        <div className="mt-1 flex gap-2">
          {RANGES.map((option, index) => (
            <button
              key={option.label}
              type="button"
              onClick={() => {
                setRangeIndex(index);
              }}
              aria-pressed={rangeIndex === index}
              className={`cifra min-h-11 flex-1 border px-3 ${
                rangeIndex === index
                  ? 'border-tinta bg-tinta text-papel-alto'
                  : 'border-linea bg-papel-alto'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="rotulo">Juega con</span>
          <input
            className="campo"
            value={lottery}
            onChange={(event) => {
              setLottery(event.target.value);
            }}
            placeholder="Lotería de Medellín"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="rotulo">Fecha del sorteo</span>
          <input
            className="campo"
            type="date"
            value={drawDate}
            onChange={(event) => {
              setDrawDate(event.target.value);
            }}
          />
        </label>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="rotulo">Premios</legend>
        {prizes.map((prize, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="cifra w-6 shrink-0 text-center text-sm text-tinta-suave">
              {index + 1}
            </span>
            <input
              className="campo"
              value={prize}
              onChange={(event) => {
                setPrizes(prizes.map((item, at) => (at === index ? event.target.value : item)));
              }}
              placeholder={index === 0 ? 'Moto Bajaj Boxer' : 'Otro premio'}
            />
            {prizes.length > 1 ? (
              <button
                type="button"
                className="min-h-11 px-2 text-tinta-suave"
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
      </fieldset>

      {error !== null && error !== undefined ? (
        <p role="alert" className="border-l-2 border-sello pl-3 text-sm text-sello">
          No pudimos crear la rifa. Revisa el nombre y el valor de la boleta.
        </p>
      ) : null}

      <button type="submit" className="boton" disabled={busy}>
        {busy ? 'Creando…' : 'Crear rifa'}
      </button>
    </form>
  );
}
