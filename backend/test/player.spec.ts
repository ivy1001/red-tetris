import {
  COLS,
  Player,
  ROWS,
} from '../src/game/entities/player.entity';

describe('Player', () => {
  it('initializes with an empty 20x10 board', () => {
    const p = new Player('s1', 'alice');
    expect(p.board.length).toBe(ROWS);
    expect(p.board[0].length).toBe(COLS);
    expect(p.board.flat().every((c) => c === 0)).toBe(true);
  });

  it('starts not alive and not host by default', () => {
    const p = new Player('s1', 'alice');
    expect(p.isAlive).toBe(false);
    expect(p.isHost).toBe(false);
  });

  it('spectrum is all zeros for an empty board', () => {
    const p = new Player('s1', 'alice');
    expect(p.getSpectrum()).toEqual(new Array(COLS).fill(0));
  });

  it('spectrum reflects highest filled cell per column', () => {
    const p = new Player('s1', 'alice');
    p.board[ROWS - 1][0] = 1; // height 1 in col 0
    p.board[ROWS - 5][3] = 2; // height 5 in col 3
    p.board[ROWS - 10][9] = 3; // height 10 in col 9
    const s = p.getSpectrum();
    expect(s[0]).toBe(1);
    expect(s[3]).toBe(5);
    expect(s[9]).toBe(10);
    expect(s[1]).toBe(0);
  });

  it('reset wipes board, piece, and aliveness', () => {
    const p = new Player('s1', 'alice');
    p.board[5][5] = 7;
    p.pieceIndex = 12;
    p.isAlive = true;
    p.touchingGround = true;
    p.reset();
    expect(p.pieceIndex).toBe(0);
    expect(p.isAlive).toBe(false);
    expect(p.touchingGround).toBe(false);
    expect(p.board.flat().every((c) => c === 0)).toBe(true);
  });

  it('emptyBoard creates fresh independent arrays', () => {
    const a = Player.emptyBoard();
    const b = Player.emptyBoard();
    a[0][0] = 9;
    expect(b[0][0]).toBe(0);
  });
});
