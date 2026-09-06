import { useState } from 'react';

import { useBoard } from '../../features/board/use-board';
import { Poster } from '../PosterPanel';

/**
 * The poster, plus a way to see it with nothing else on screen: the organizer
 * screenshots that view to share the raffle.
 */
export function PosterTab(): React.JSX.Element {
  const { board } = useBoard();
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <section className="flex flex-col gap-3">
      <p className="text-sm text-tinta-suave">
        Así ven la rifa tus clientes. Ábrelo en pantalla completa y tómale una captura para
        mandarlo por WhatsApp.
      </p>

      <div className="border border-linea">
        <Poster board={board} />
      </div>

      <button
        type="button"
        className="boton"
        onClick={() => {
          setFullscreen(true);
        }}
      >
        Ver en pantalla completa
      </button>

      {fullscreen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-papel">
          {/* Kept out of the poster frame so it never lands in the screenshot. */}
          <div className="flex justify-end px-4 py-2">
            <button
              type="button"
              className="min-h-11 text-sm underline underline-offset-4"
              onClick={() => {
                setFullscreen(false);
              }}
            >
              Cerrar
            </button>
          </div>
          <Poster board={board} />
        </div>
      ) : null}
    </section>
  );
}
