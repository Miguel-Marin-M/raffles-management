export type CellState = 'free' | 'reserved' | 'paid';

interface NumberCellProps {
  readonly label: string;
  readonly state: CellState;
  readonly selected: boolean;
  readonly customerName?: string | undefined;
  readonly onSelect: () => void;
}

const STATE_LABEL: Record<CellState, string> = {
  free: 'libre',
  reserved: 'apartada',
  paid: 'pagada',
};

/**
 * One number of the board.
 *
 * A paid number is struck through with an irregular stroke that draws itself,
 * mirroring what the organizer used to do with a pen on the printed poster.
 * The state is never carried by colour alone: taken numbers are also filled
 * and paid ones are crossed out.
 */
export function NumberCell({
  label,
  state,
  selected,
  customerName,
  onSelect,
}: NumberCellProps): React.JSX.Element {
  const description =
    customerName === undefined
      ? `${label}, ${STATE_LABEL[state]}`
      : `${label}, ${STATE_LABEL[state]} por ${customerName}`;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={description}
      aria-pressed={selected}
      data-state={state}
      className={[
        'relative aspect-square w-full select-none',
        'rounded-[3px] border transition-[background-color,border-color,transform] duration-150',
        'font-display text-[clamp(1rem,4.4vw,1.35rem)] font-semibold tabular-nums',
        'active:scale-[0.97]',
        state === 'free' ? 'border-linea bg-papel-alto text-tinta' : '',
        state === 'reserved' ? 'border-sello bg-sello/12 text-sello' : '',
        state === 'paid' ? 'border-linea bg-transparent text-tinta-suave' : '',
        selected ? 'border-tinta bg-tinta text-papel-alto' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ fontStretch: '112%' }}
    >
      {label}

      {state === 'paid' ? (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 40 40"
          aria-hidden="true"
        >
          {/* Hand-drawn, not a straight line: the wobble is what makes it read as pen. */}
          <path
            d="M6 33 C 13 27, 19 20, 26 12 S 32 8, 34 6"
            fill="none"
            stroke="var(--color-cancelado)"
            strokeWidth="2.4"
            strokeLinecap="round"
            pathLength={1}
            className="[stroke-dasharray:1] [stroke-dashoffset:0] motion-safe:animate-[tachar_420ms_ease-out]"
          />
        </svg>
      ) : null}

      {state === 'reserved' ? (
        <span
          aria-hidden="true"
          className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-sello"
        />
      ) : null}
    </button>
  );
}
