export type CellState = 'free' | 'reserved' | 'paid';

interface NumberCellProps {
  readonly label: string;
  readonly state: CellState;
  readonly selected: boolean;
  readonly customerName?: string | undefined;
  readonly onSelect: () => void;
}

const STATE_STYLE: Record<CellState, string> = {
  free: 'border-rule bg-sheet text-ink',
  reserved: 'border-stamp bg-stamp/12 text-stamp',
  paid: 'border-rule bg-transparent text-ink-soft',
};

const SELECTED_STYLE = 'border-ink bg-ink-soft text-sheet';

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
        'rounded-[2px] border transition-[background-color,border-color,transform] duration-150',
        'font-display text-[length:var(--cell-font-size)] font-semibold tabular-nums',
        'active:scale-[0.97]',
        // One branch only: emitting the state and the selection together lets
        // whichever utility Tailwind wrote last win, which is not a choice.
        selected ? SELECTED_STYLE : STATE_STYLE[state],
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ fontStretch: 'var(--cell-font-stretch)' }}
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
            stroke="var(--color-paid)"
            strokeWidth="2.4"
            strokeLinecap="round"
            pathLength={1}
            className="[stroke-dasharray:1] [stroke-dashoffset:0] motion-safe:animate-[strike_420ms_ease-out]"
          />
        </svg>
      ) : null}

      {state === 'reserved' ? (
        <span
          aria-hidden="true"
          className="absolute right-0.5 top-0.5 h-1 w-1 rounded-full bg-stamp sm:right-1 sm:top-1 sm:h-1.5 sm:w-1.5"
        />
      ) : null}
    </button>
  );
}
