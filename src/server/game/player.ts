import { Piece } from './piece';
import {
  Board,
  GHOST,
  PieceType,
  aboveTop,
  addPenalty,
  clearLines,
  collides,
  dropY,
  emptyBoard,
  hideStack,
  liftY,
  merge,
  spectrum,
} from './tetris';

export class Player {
  board: Board = emptyBoard();
  piece: Piece | null = null;
  pieceIndex = 0; // position in the game's shared piece sequence
  alive = true;
  score = 0;

  constructor(
    readonly id: string,
    readonly name: string,
  ) {}

  reset(): void {
    this.board = emptyBoard();
    this.piece = null;
    this.pieceIndex = 0;
    this.alive = true;
    this.score = 0;
  }

  private fits(p: Piece): boolean {
    return !collides(this.board, p.matrix, p.x, p.y);
  }

  // Returns false (and dies) when the new piece can't enter the field.
  spawn(type: PieceType): boolean {
    this.piece = new Piece(type);
    this.pieceIndex++;
    if (!this.fits(this.piece)) this.alive = false;
    return this.alive;
  }

  private tryPlace(next: Piece | undefined): boolean {
    if (!this.alive || !next || !this.fits(next)) return false;
    this.piece = next;
    return true;
  }

  move(dx: number, dy: number): boolean {
    return this.tryPlace(this.piece?.moved(dx, dy));
  }

  rotate(): boolean {
    return this.tryPlace(this.piece?.rotated());
  }

  // Merges the piece into the board; returns the number of lines cleared.
  // Locking with blocks above the top means the pile left the field: the player is out.
  lock(): number {
    if (!this.piece) return 0;
    const { matrix, x, y, color } = this.piece;
    if (aboveTop(matrix, y)) this.alive = false;
    const result = clearLines(merge(this.board, matrix, x, y, color));
    this.board = result.board;
    this.piece = null;
    return result.cleared;
  }

  hardDrop(): number {
    const p = this.piece;
    if (p) this.piece = p.moved(0, dropY(this.board, p.matrix, p.x, p.y) - p.y);
    return this.lock();
  }

  receivePenalty(n: number): void {
    const result = addPenalty(this.board, n);
    this.board = result.board;
    if (result.overflow) this.alive = false;
    // The stack rose under the falling piece: push the piece up with it.
    const p = this.piece;
    if (this.alive && p) this.piece = p.moved(0, liftY(this.board, p.matrix, p.x, p.y) - p.y);
  }

  // What the client renders: board + ghost + falling piece. Invisible mode hides the stack and the ghost.
  view(invisible = false): Board {
    const p = this.piece;
    if (!p) return invisible ? hideStack(this.board) : this.board;
    const base = invisible
      ? hideStack(this.board)
      : merge(this.board, p.matrix, p.x, dropY(this.board, p.matrix, p.x, p.y), GHOST);
    return merge(base, p.matrix, p.x, p.y, p.color);
  }

  spectrum(): number[] {
    return spectrum(this.board);
  }
}
