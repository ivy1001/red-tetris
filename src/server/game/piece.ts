import { COLS, Matrix, PieceType, SHAPES, rotate } from './tetris';

// Immutable: moves/rotations return a new Piece.
export class Piece {
  constructor(
    readonly type: PieceType,
    readonly matrix: Matrix = SHAPES[type].matrix,
    // Same spawn for everyone: centered, top row (I's blocks sit on its box's 2nd row).
    readonly x: number = Math.floor((COLS - SHAPES[type].matrix[0].length) / 2),
    readonly y: number = type === 'I' ? -1 : 0,
  ) {}

  get color(): string {
    return SHAPES[this.type].color;
  }

  moved(dx: number, dy: number): Piece {
    return new Piece(this.type, this.matrix, this.x + dx, this.y + dy);
  }

  rotated(): Piece {
    return new Piece(this.type, rotate(this.matrix), this.x, this.y);
  }
}
