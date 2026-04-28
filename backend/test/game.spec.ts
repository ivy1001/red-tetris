import { Game } from '../src/game/entities/game.entity';
import { Player, ROWS, COLS, PENALTY_CELL } from '../src/game/entities/player.entity';
import { Piece } from '../src/game/entities/piece.entity';

const makeFakeIo = (): any => ({
  to: () => ({ emit: () => {} }),
});

describe('Game', () => {
  let game: Game;

  beforeEach(() => {
    // huge tickMs so the interval never fires during tests; we call tick() manually
    game = new Game('test-room', makeFakeIo(), 1_000_000);
  });

  afterEach(() => {
    game.stop();
  });

  it('starts in waiting status with no players', () => {
    expect(game.status).toBe('waiting');
    expect(game.players).toEqual([]);
  });

  it('first player added becomes the host', () => {
    const p = new Player('s1', 'alice');
    expect(game.addPlayer(p)).toBe(true);
    expect(p.isHost).toBe(true);
  });

  it('rejects duplicate player names', () => {
    expect(game.addPlayer(new Player('s1', 'alice'))).toBe(true);
    expect(game.addPlayer(new Player('s2', 'alice'))).toBe(false);
  });

  it('rejects new players once the game is playing', () => {
    game.addPlayer(new Player('s1', 'alice'));
    game.start('s1');
    expect(game.addPlayer(new Player('s2', 'bob'))).toBe(false);
  });

  it('only the host can start the game', () => {
    game.addPlayer(new Player('s1', 'alice'));
    game.addPlayer(new Player('s2', 'bob'));
    expect(game.start('s2')).toBe(false);
    expect(game.start('s1')).toBe(true);
  });

  it('removing the host reassigns host to next player', () => {
    const a = new Player('s1', 'alice');
    const b = new Player('s2', 'bob');
    game.addPlayer(a);
    game.addPlayer(b);
    const result = game.removePlayer('s1');
    expect(result.newHost?.id).toBe('s2');
    expect(b.isHost).toBe(true);
  });

  it('isEmpty after all players removed', () => {
    game.addPlayer(new Player('s1', 'alice'));
    game.removePlayer('s1');
    expect(game.isEmpty()).toBe(true);
  });

  it('all players in a room get the same first piece', () => {
    game.addPlayer(new Player('s1', 'alice'));
    game.addPlayer(new Player('s2', 'bob'));
    game.start('s1');
    const a = game.getPlayer('s1')!;
    const b = game.getPlayer('s2')!;
    expect(a.currentPiece!.type).toBe(b.currentPiece!.type);
  });

  it('canPlace rejects out-of-bounds positions', () => {
    game.addPlayer(new Player('s1', 'alice'));
    game.start('s1');
    const p = game.getPlayer('s1')!;
    const piece = p.currentPiece!;
    expect(game.canPlace(p.board, piece.moved(-10, 0))).toBe(false);
    expect(game.canPlace(p.board, piece.moved(10, 0))).toBe(false);
    expect(game.canPlace(p.board, piece.moved(0, ROWS + 5))).toBe(false);
  });

  it('hard_drop locks the piece at the bottom', () => {
    game.addPlayer(new Player('s1', 'alice'));
    game.start('s1');
    const p = game.getPlayer('s1')!;
    const initialIndex = p.pieceIndex;
    game.handleInput('s1', 'hard_drop');
    // a new piece spawned, so pieceIndex advanced
    expect(p.pieceIndex).toBe(initialIndex + 1);
    // bottom row has at least one filled cell
    const bottomFilled = p.board[ROWS - 1].some((c) => c !== 0);
    expect(bottomFilled).toBe(true);
  });

  it('clearLines removes a full row of piece cells', () => {
    game.addPlayer(new Player('s1', 'alice'));
    game.start('s1');
    const p = game.getPlayer('s1')!;
    // fill bottom row with piece color
    p.board[ROWS - 1] = new Array(COLS).fill(1);
    // call private via cast for direct test
    const cleared = (game as any).clearLines(p.board);
    expect(cleared).toBe(1);
    expect(p.board[ROWS - 1].every((c) => c === 0)).toBe(true);
  });

  it('clearLines does NOT remove rows containing penalty cells', () => {
    game.addPlayer(new Player('s1', 'alice'));
    game.start('s1');
    const p = game.getPlayer('s1')!;
    p.board[ROWS - 1] = new Array(COLS).fill(PENALTY_CELL);
    const cleared = (game as any).clearLines(p.board);
    expect(cleared).toBe(0);
    expect(p.board[ROWS - 1].every((c) => c === PENALTY_CELL)).toBe(true);
  });

  it('addPenaltyLines pushes board up and adds indestructible rows', () => {
    game.addPlayer(new Player('s1', 'alice'));
    game.start('s1');
    const p = game.getPlayer('s1')!;
    p.board[ROWS - 1][0] = 1;
    (game as any).addPenaltyLines(p, 2);
    expect(p.board[ROWS - 1].every((c) => c === PENALTY_CELL)).toBe(true);
    expect(p.board[ROWS - 2].every((c) => c === PENALTY_CELL)).toBe(true);
    expect(p.board[ROWS - 3][0]).toBe(1);
  });

  it('multiplayer game ends when only one player remains alive', () => {
    game.addPlayer(new Player('s1', 'alice'));
    game.addPlayer(new Player('s2', 'bob'));
    game.start('s1');
    const bob = game.getPlayer('s2')!;
    bob.isAlive = false;
    const ended = game.checkGameOver();
    expect(ended).toBe(true);
    expect(game.status).toBe('ended');
    expect(game.winner).toBe('alice');
  });

  it('solo game ends when the only player dies', () => {
    game.addPlayer(new Player('s1', 'alice'));
    game.start('s1');
    const a = game.getPlayer('s1')!;
    a.isAlive = false;
    const ended = game.checkGameOver();
    expect(ended).toBe(true);
    expect(game.status).toBe('ended');
    expect(game.winner).toBeNull();
  });

  it('tick advances a piece downward by one row', () => {
    game.addPlayer(new Player('s1', 'alice'));
    game.start('s1');
    const p = game.getPlayer('s1')!;
    const beforeY = p.currentPiece!.y;
    game.tick();
    expect(p.currentPiece!.y).toBe(beforeY + 1);
  });

  it('buildGameState exposes board and opponent spectrums', () => {
    game.addPlayer(new Player('s1', 'alice'));
    game.addPlayer(new Player('s2', 'bob'));
    game.start('s1');
    const a = game.getPlayer('s1')!;
    const state = game.buildGameState(a);
    expect(state.board.length).toBe(ROWS);
    expect(state.opponents.length).toBe(1);
    expect(state.opponents[0].name).toBe('bob');
    expect(state.opponents[0].spectrum.length).toBe(COLS);
  });

  it('left/right inputs move the piece horizontally', () => {
    game.addPlayer(new Player('s1', 'alice'));
    game.start('s1');
    const p = game.getPlayer('s1')!;
    const startX = p.currentPiece!.x;
    game.handleInput('s1', 'left');
    expect(p.currentPiece!.x).toBe(startX - 1);
    game.handleInput('s1', 'right');
    expect(p.currentPiece!.x).toBe(startX);
  });

  it('rotate input changes piece rotation when valid', () => {
    game.addPlayer(new Player('s1', 'alice'));
    game.start('s1');
    const p = game.getPlayer('s1')!;
    if (p.currentPiece!.type === 'O') return; // O does not rotate visually
    const before = p.currentPiece!.rotation;
    game.handleInput('s1', 'rotate');
    expect(p.currentPiece!.rotation).toBe((before + 1) % 4);
  });
});
