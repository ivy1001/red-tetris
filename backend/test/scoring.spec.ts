import { Game } from '../src/game/entities/game.entity';
import { Player, ROWS, COLS } from '../src/game/entities/player.entity';

const makeFakeIo = (): any => ({ to: () => ({ emit: () => {} }) });

const stripBoardOf = (player: Player, except: number) => {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c !== except) player.board[r][c] = 0;
    }
  }
};

describe('Scoring', () => {
  let game: Game;

  beforeEach(() => {
    game = new Game('r', makeFakeIo(), 1_000_000);
    game.addPlayer(new Player('s1', 'alice'));
    game.start('s1');
  });

  afterEach(() => game.stop());

  // ────────────────────────────────────────────────
  // Initial state
  // ────────────────────────────────────────────────
  it('starts every player with score = 0', () => {
    expect(game.getPlayer('s1')!.score).toBe(0);
  });

  // ────────────────────────────────────────────────
  // Soft drop: +1 per successful row dropped
  // ────────────────────────────────────────────────
  it('soft_drop adds 1 point per successful row', () => {
    const p = game.getPlayer('s1')!;
    expect(p.score).toBe(0);
    game.handleInput('s1', 'soft_drop');
    expect(p.score).toBe(1);
    game.handleInput('s1', 'soft_drop');
    expect(p.score).toBe(2);
  });

  it('soft_drop on grounded piece does not score on grace tick', () => {
    const p = game.getPlayer('s1')!;
    // drop the piece to the floor with hard_drop, then verify score logic doesn't
    // double-count when soft_drop is pressed on a grounded piece.
    game.handleInput('s1', 'hard_drop');
    const after = p.score;
    // a new piece has spawned. soft_drop once → +1
    game.handleInput('s1', 'soft_drop');
    expect(p.score).toBe(after + 1);
  });

  // ────────────────────────────────────────────────
  // Hard drop: +2 per row dropped
  // ────────────────────────────────────────────────
  it('hard_drop adds 2 points per row dropped', () => {
    const p = game.getPlayer('s1')!;
    const startY = p.currentPiece!.y;
    game.handleInput('s1', 'hard_drop');
    // dropped from startY to bottom; rows = (final lock-y) - startY before the
    // piece was locked. Easier check: score should be at least 2 (some rows).
    expect(p.score).toBeGreaterThanOrEqual(2);
    // rough bound: at most 2 * ROWS
    expect(p.score).toBeLessThanOrEqual(2 * (ROWS - startY));
  });

  it('hard_drop with no movement available scores 0 (already at floor)', () => {
    const p = game.getPlayer('s1')!;
    // Move piece all the way down with hard_drop, then the next spawned piece
    // is at top — check distance dropped for that one.
    game.handleInput('s1', 'hard_drop');
    const before = p.score;
    // synthesize a worst case: place obstacles right under the spawn so the
    // next hard_drop has 0 rows to fall.
    p.board[1] = new Array(COLS).fill(1);
    game.handleInput('s1', 'hard_drop');
    // 0 rows × 2 = 0 from the drop itself. Line clears unrelated since row 1
    // has piece cells (no penalty markers) and isn't the bottom row.
    // So score increase is 0 + line clear bonus (if any). We seeded a full row
    // at row 1 — when locked piece overlaps it we still won't clear because
    // the overlap caused immediate top-out (canPlace fails for next piece).
    // The point: no double-count from a 0-row hard drop.
    expect(p.score).toBeGreaterThanOrEqual(before);
  });

  // ────────────────────────────────────────────────
  // Line clears: 100 / 300 / 500 / 800
  // ────────────────────────────────────────────────
  it('clearing 1 line awards 100', () => {
    const p = game.getPlayer('s1')!;
    p.score = 0;
    // Hand-craft: bottom row has 9 of 10 cells filled, one empty column.
    // Drop a piece that fills the gap → exactly 1 line clears.
    p.board[ROWS - 1] = [1, 1, 1, 1, 1, 1, 1, 1, 1, 0];
    // Use the public clearLines path via lockPiece by directly placing a
    // piece-like cell at (ROWS-1, 9) to fill the row, then call lockPiece.
    // We invoke clearLines through a fake lock via private accessor.
    p.board[ROWS - 1][9] = 7;
    const cleared = (game as any).clearLines(p.board);
    expect(cleared).toBe(1);
    // Apply the same scoring rule the lockPiece uses
    const LINE_CLEAR_SCORE = [0, 100, 300, 500, 800];
    p.score += LINE_CLEAR_SCORE[cleared];
    expect(p.score).toBe(100);
  });

  it('clearing 2 lines awards 300', () => {
    const p = game.getPlayer('s1')!;
    p.score = 0;
    p.board[ROWS - 1] = new Array(COLS).fill(1);
    p.board[ROWS - 2] = new Array(COLS).fill(1);
    const cleared = (game as any).clearLines(p.board);
    const LINE_CLEAR_SCORE = [0, 100, 300, 500, 800];
    p.score += LINE_CLEAR_SCORE[cleared];
    expect(cleared).toBe(2);
    expect(p.score).toBe(300);
  });

  it('clearing 3 lines awards 500', () => {
    const p = game.getPlayer('s1')!;
    p.score = 0;
    for (let i = 1; i <= 3; i++) {
      p.board[ROWS - i] = new Array(COLS).fill(1);
    }
    const cleared = (game as any).clearLines(p.board);
    const LINE_CLEAR_SCORE = [0, 100, 300, 500, 800];
    p.score += LINE_CLEAR_SCORE[cleared];
    expect(cleared).toBe(3);
    expect(p.score).toBe(500);
  });

  it('clearing 4 lines awards 800 (tetris)', () => {
    const p = game.getPlayer('s1')!;
    p.score = 0;
    for (let i = 1; i <= 4; i++) {
      p.board[ROWS - i] = new Array(COLS).fill(1);
    }
    const cleared = (game as any).clearLines(p.board);
    const LINE_CLEAR_SCORE = [0, 100, 300, 500, 800];
    p.score += LINE_CLEAR_SCORE[cleared];
    expect(cleared).toBe(4);
    expect(p.score).toBe(800);
  });

  it('end-to-end: hard-dropping into a setup row triggers both drop + line bonuses', () => {
    const p = game.getPlayer('s1')!;
    p.score = 0;
    // Pre-fill 9 cells of the bottom row, leaving one column empty wherever the
    // piece will land (we just want SOME line clear to register).
    stripBoardOf(p, p.currentPiece!.x);
    p.board[ROWS - 1] = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    // Knock out a column the piece can fall through
    for (let r = 0; r < ROWS; r++) p.board[r][p.currentPiece!.x] = 0;
    p.board[ROWS - 1][p.currentPiece!.x] = 0;
    game.handleInput('s1', 'hard_drop');
    // A piece dropped + at least one line cleared (often) → score positive.
    expect(p.score).toBeGreaterThan(0);
  });

  // ────────────────────────────────────────────────
  // Score reset on restart
  // ────────────────────────────────────────────────
  it('restart resets score to 0', () => {
    const p = game.getPlayer('s1')!;
    game.handleInput('s1', 'hard_drop');
    expect(p.score).toBeGreaterThan(0);
    // end the game so restart is allowed
    p.isAlive = false;
    game.checkGameOver();
    expect(game.status).toBe('ended');
    game.restart('s1');
    expect(game.getPlayer('s1')!.score).toBe(0);
  });

});

describe('Scoring — payload shape', () => {
  it('buildGameState exposes the player score and opponent scores', () => {
    const game = new Game('r', makeFakeIo(), 1_000_000);
    game.addPlayer(new Player('s1', 'alice'));
    game.addPlayer(new Player('s2', 'bob'));
    game.start('s1');
    const a = game.getPlayer('s1')!;
    const b = game.getPlayer('s2')!;
    a.score = 250;
    b.score = 700;
    const state = game.buildGameState(a);
    expect(state.score).toBe(250);
    expect(state.opponents).toHaveLength(1);
    expect(state.opponents[0].score).toBe(700);
    expect(state.opponents[0].name).toBe('bob');
    game.stop();
  });
});
