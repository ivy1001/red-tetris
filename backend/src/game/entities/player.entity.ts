import { Piece } from './piece.entity';

export const ROWS = 20;
export const COLS = 10;
export const EMPTY_CELL = 0;
export const PENALTY_CELL = 8;

export class Player {
  id: string;
  name: string;
  isHost: boolean;
  isAlive: boolean;
  board: number[][];
  currentPiece: Piece | null;
  pieceIndex: number;
  touchingGround: boolean;
  score: number;

  constructor(id: string, name: string, isHost = false) {
    this.id = id;
    this.name = name;
    this.isHost = isHost;
    this.isAlive = false;
    this.board = Player.emptyBoard();
    this.currentPiece = null;
    this.pieceIndex = 0;
    this.touchingGround = false;
    this.score = 0;
  }

  static emptyBoard(): number[][] {
    return Array.from({ length: ROWS }, () =>
      new Array(COLS).fill(EMPTY_CELL),
    );
  }

  reset(): void {
    this.board = Player.emptyBoard();
    this.currentPiece = null;
    this.pieceIndex = 0;
    this.touchingGround = false;
    this.isAlive = false;
    this.score = 0;
  }

  getSpectrum(): number[] {
    const spectrum = new Array(COLS).fill(0);
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (this.board[r][c] !== EMPTY_CELL) {
          spectrum[c] = ROWS - r;
          break;
        }
      }
    }
    return spectrum;
  }
}
