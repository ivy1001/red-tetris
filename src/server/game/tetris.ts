// Pure board logic: no state, no mutation. Classes in piece/player/game wrap these.

export const ROWS = 20;
export const COLS = 10;
export const EMPTY = 'empty';
export const PENALTY = 'penalty';
export const GHOST = 'ghost'; // where the falling piece would land

// Bonus scoring: classic points per number of lines cleared at once.
export const POINTS = [0, 40, 100, 300, 1200];

export type Cell = string; // EMPTY | PENALTY | a color name (matches the client's .cell.<color> CSS)
export type Board = Cell[][];
export type Matrix = number[][];
export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

// Spawn orientation of each tetrimino in its rotation box (SRS layout).
export const SHAPES: Record<PieceType, { color: string; matrix: Matrix }> = {
  I: { color: 'cyan', matrix: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]] },
  J: { color: 'blue', matrix: [[1, 0, 0], [1, 1, 1], [0, 0, 0]] },
  L: { color: 'orange', matrix: [[0, 0, 1], [1, 1, 1], [0, 0, 0]] },
  O: { color: 'yellow', matrix: [[1, 1], [1, 1]] },
  S: { color: 'green', matrix: [[0, 1, 1], [1, 1, 0], [0, 0, 0]] },
  T: { color: 'purple', matrix: [[0, 1, 0], [1, 1, 1], [0, 0, 0]] },
  Z: { color: 'red', matrix: [[1, 1, 0], [0, 1, 1], [0, 0, 0]] },
};
export const PIECE_TYPES = Object.keys(SHAPES) as PieceType[];

export const emptyRow = (fill: Cell = EMPTY): Cell[] => Array(COLS).fill(fill);
export const emptyBoard = (): Board => Array.from({ length: ROWS }, () => emptyRow());

export const rotate = (m: Matrix): Matrix => m[0].map((_, c) => m.map((row) => row[c]).reverse());

const cellsOf = (m: Matrix, x: number, y: number): [number, number][] =>
  m.flatMap((row, r) => row.flatMap((v, c) => (v ? [[y + r, x + c] as [number, number]] : [])));

// Cells above the top (row < 0) are free, so pieces can spawn/rotate partly off-screen.
export const collides = (board: Board, m: Matrix, x: number, y: number): boolean =>
  cellsOf(m, x, y).some(([r, c]) => c < 0 || c >= COLS || r >= ROWS || (r >= 0 && board[r][c] !== EMPTY));

// Lowest y the matrix can fall to from (x, y).
export const dropY = (board: Board, m: Matrix, x: number, y: number): number =>
  collides(board, m, x, y + 1) ? y : dropY(board, m, x, y + 1);

// Highest y <= y where the matrix fits again (the stack rose under it). Rows above the top are
// free, so once the whole matrix is above the field it stops.
export const liftY = (board: Board, m: Matrix, x: number, y: number): number =>
  y < -m.length || !collides(board, m, x, y) ? y : liftY(board, m, x, y - 1);

// True if any block of the matrix is above the top row (locking it there = topped out).
export const aboveTop = (m: Matrix, y: number): boolean => m.some((row, r) => y + r < 0 && row.some(Boolean));

// Hides locked blocks (invisible mode); penalty rows stay visible.
export const hideStack = (board: Board): Board => board.map((row) => row.map((c) => (c === PENALTY ? c : EMPTY)));

// Next-piece preview: the spawn matrix in color, without its empty rows.
export const preview = (type: PieceType): Cell[][] =>
  SHAPES[type].matrix.filter((row) => row.some(Boolean)).map((row) => row.map((v) => (v ? SHAPES[type].color : EMPTY)));

export const merge = (board: Board, m: Matrix, x: number, y: number, color: Cell): Board => {
  const next = board.map((row) => [...row]);
  cellsOf(m, x, y).forEach(([r, c]) => r >= 0 && (next[r][c] = color));
  return next;
};

// Penalty rows are indestructible: a row containing one is never cleared.
export const clearLines = (board: Board): { board: Board; cleared: number } => {
  const kept = board.filter((row) => row.includes(EMPTY) || row.includes(PENALTY));
  const cleared = ROWS - kept.length;
  return { board: [...Array.from({ length: cleared }, () => emptyRow()), ...kept], cleared };
};

// Pushes the stack up by n; overflow = blocks were pushed out the top.
export const addPenalty = (board: Board, n: number): { board: Board; overflow: boolean } => ({
  board: [...board.slice(n), ...Array.from({ length: n }, () => emptyRow(PENALTY))],
  overflow: board.slice(0, n).some((row) => row.some((c) => c !== EMPTY)),
});

// Height of the highest block in each column (0 = empty column).
export const spectrum = (board: Board): number[] =>
  Array.from({ length: COLS }, (_, c) => {
    const top = board.findIndex((row) => row[c] !== EMPTY);
    return top === -1 ? 0 : ROWS - top;
  });
