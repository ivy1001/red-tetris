import { useMemo, type FC } from 'react';
import { useAppSelector } from '../store/hooks';
import { Cell } from './Cell';

const ROWS = 20;
const COLS = 10;

// Renders the 20×10 board plus the current piece projected on top.
// Presentation only — no game logic.
export const Board: FC = () => {
  const board = useAppSelector((s) => s.game.board);
  const piece = useAppSelector((s) => s.game.currentPiece);
  const isAlive = useAppSelector((s) => s.game.isAlive);

  const { grid, activeCells } = useMemo(() => {
    const safe =
      board.length === ROWS
        ? board.map((row) => [...row])
        : Array.from({ length: ROWS }, () => new Array(COLS).fill(0));

    const active = new Set<string>();

    if (piece) {
      const { matrix, x, y, color } = piece;
      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          if (!matrix[r][c]) continue;
          const yy = y + r;
          const xx = x + c;
          if (yy >= 0 && yy < ROWS && xx >= 0 && xx < COLS) {
            safe[yy][xx] = color;
            active.add(`${yy}-${xx}`);
          }
        }
      }
    }
    return { grid: safe, activeCells: active };
  }, [board, piece]);

  return (
    <div className={`board-frame${isAlive ? '' : ' dead'}`}>
      <div className="board-frame-inner">
        <div className="board">
          {grid.map((row, r) =>
            row.map((cell, c) => (
              <Cell
                key={`${r}-${c}`}
                value={cell}
                active={activeCells.has(`${r}-${c}`)}
              />
            )),
          )}
        </div>
      </div>
      {!isAlive && (
        <div className="board-overlay">
          <span className="overlay-glyph">×</span>
          <span>eliminated</span>
        </div>
      )}
    </div>
  );
};
