import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Game, MODES } from '../../src/server/game/game';
import { Piece } from '../../src/server/game/piece';
import { Player } from '../../src/server/game/player';
import {
  EMPTY,
  GHOST,
  PENALTY,
  POINTS,
  ROWS,
  SHAPES,
  addPenalty,
  clearLines,
  collides,
  dropY,
  emptyBoard,
  emptyRow,
  hideStack,
  preview,
  rotate,
  spectrum,
} from '../../src/server/game/tetris';

const fullRowExcept = (...holes: number[]) => emptyRow('red').map((c, i) => (holes.includes(i) ? EMPTY : c));

describe('tetris (pure)', () => {
  it('rotates clockwise and cycles after 4', () => {
    const t = SHAPES.T.matrix;
    expect(rotate(t)).toEqual([[0, 1, 0], [0, 1, 1], [0, 1, 0]]);
    expect(rotate(rotate(rotate(rotate(t))))).toEqual(t);
  });

  it('detects walls, floor and blocks but allows above the top', () => {
    const board = emptyBoard();
    board[19][0] = 'red';
    const o = SHAPES.O.matrix;
    expect(collides(board, o, -1, 0)).toBe(true);
    expect(collides(board, o, 9, 0)).toBe(true);
    expect(collides(board, o, 4, 19)).toBe(true);
    expect(collides(board, o, 0, 18)).toBe(true);
    expect(collides(board, o, 4, -1)).toBe(false);
  });

  it('clears full rows but never penalty rows', () => {
    const board = emptyBoard();
    board[19] = emptyRow('red');
    board[18] = emptyRow(PENALTY);
    const result = clearLines(board);
    expect(result.cleared).toBe(1);
    expect(result.board[19]).toEqual(emptyRow(PENALTY));
    expect(result.board).toHaveLength(ROWS);
  });

  it('adds penalty rows at the bottom and reports overflow', () => {
    const board = emptyBoard();
    expect(addPenalty(board, 2).board.slice(18)).toEqual([emptyRow(PENALTY), emptyRow(PENALTY)]);
    expect(addPenalty(board, 2).overflow).toBe(false);
    board[0][0] = 'red';
    expect(addPenalty(board, 1).overflow).toBe(true);
  });

  it('computes the spectrum', () => {
    const board = emptyBoard();
    board[19][0] = 'red';
    board[10][9] = 'red';
    expect(spectrum(board)).toEqual([1, 0, 0, 0, 0, 0, 0, 0, 0, 10]);
  });
});

describe('Piece / Player', () => {
  it('spawns every piece at the same centered position', () => {
    expect(new Piece('I')).toMatchObject({ x: 3, y: -1, color: 'cyan' });
    expect(new Piece('O')).toMatchObject({ x: 4, y: 0 });
    expect(new Piece('T')).toMatchObject({ x: 3, y: 0 });
  });

  it('hard drops to the floor and locks', () => {
    const p = new Player('1', 'a');
    p.spawn('I');
    expect(p.hardDrop()).toBe(0);
    expect(p.board[19].slice(3, 7)).toEqual(['cyan', 'cyan', 'cyan', 'cyan']);
    expect(p.piece).toBeNull();
  });

  it('blocks moves into walls and rotations into blocks', () => {
    const p = new Player('1', 'a');
    p.spawn('O');
    expect(p.move(-4, 0)).toBe(true);
    expect(p.move(-1, 0)).toBe(false);
    p.spawn('I');
    p.board[0][5] = 'red';
    expect(p.rotate()).toBe(false);
  });

  it('dies when the spawn is blocked', () => {
    const p = new Player('1', 'a');
    p.board[0][4] = 'red';
    expect(p.spawn('O')).toBe(false);
    expect(p.alive).toBe(false);
    expect(p.move(1, 0)).toBe(false);
  });

  it('pushes the falling piece up when penalties arrive', () => {
    const p = new Player('1', 'a');
    p.spawn('O');
    while (p.move(0, 1));
    p.receivePenalty(2);
    expect(p.piece!.y).toBe(16);
    expect(p.view()[17][4]).toBe('yellow');
  });
});

describe('Game', () => {
  let changes: number;
  let game: Game;
  beforeEach(() => {
    vi.useFakeTimers();
    changes = 0;
    game = new Game('room', () => changes++);
  });
  afterEach(() => {
    game.stop();
    vi.useRealTimers();
  });

  it('manages host, joins and names', () => {
    game.addPlayer('1', 'alice');
    game.addPlayer('2', 'bob');
    expect(game.host!.name).toBe('alice');
    expect(() => game.addPlayer('3', 'bob')).toThrow('taken');
    expect(() => game.start('2')).toThrow('host');
    game.removePlayer('1');
    expect(game.host!.name).toBe('bob');
    game.start('2');
    expect(() => game.start('2')).toThrow('running');
    expect(() => game.addPlayer('4', 'carol')).toThrow('started');
  });

  it('deals the same pieces to every player', () => {
    const a = game.addPlayer('1', 'a');
    const b = game.addPlayer('2', 'b');
    game.start('1');
    expect(a.piece).toEqual(b.piece);
    game.handleInput('1', 'drop');
    game.handleInput('1', 'drop');
    game.handleInput('2', 'drop');
    game.handleInput('2', 'drop');
    expect(a.piece).toEqual(b.piece);
  });

  it('applies gravity and locks only on the tick after landing', () => {
    const a = game.addPlayer('1', 'a');
    game.start('1');
    a.piece = new Piece('O');
    vi.advanceTimersByTime(500 * 18); // O reaches y=18, resting on the floor
    expect(a.piece.y).toBe(18);
    game.handleInput('1', 'left'); // still movable during the grace frame
    expect(a.piece.x).toBe(3);
    vi.advanceTimersByTime(500);
    expect(a.board[19][3]).toBe('yellow');
    expect(a.pieceIndex).toBe(2);
  });

  it('handles every input and ignores bad ones', () => {
    const a = game.addPlayer('1', 'a');
    game.handleInput('1', 'left'); // not playing yet
    game.start('1');
    a.piece = new Piece('T');
    game.handleInput('1', 'right');
    game.handleInput('1', 'down');
    game.handleInput('1', 'rotate');
    expect(a.piece).toMatchObject({ x: 4, y: 1, matrix: [[0, 1, 0], [0, 1, 1], [0, 1, 0]] });
    const before = changes;
    game.handleInput('1', 'jump' as never);
    game.handleInput('nobody', 'left');
    expect(changes).toBe(before);
  });

  it('sends n-1 penalty lines to opponents', () => {
    const a = game.addPlayer('1', 'a');
    const b = game.addPlayer('2', 'b');
    game.start('1');
    a.board[18] = fullRowExcept(4, 5);
    a.board[19] = fullRowExcept(4, 5);
    a.piece = new Piece('O');
    game.handleInput('1', 'drop');
    expect(a.board[19]).toEqual(emptyRow());
    expect(b.board[19]).toEqual(emptyRow(PENALTY));
    expect(b.board[18]).toEqual(emptyRow());
  });

  it('ends multiplayer when one player remains', () => {
    game.addPlayer('1', 'a');
    game.addPlayer('2', 'b');
    game.start('1');
    game.removePlayer('2');
    expect(game.status).toBe('ended');
    expect(game.winner).toBe('a');
    game.start('1'); // restart
    expect(game.status).toBe('playing');
    expect(game.winner).toBeNull();
  });

  it('ends solo when the player tops out, and builds per-player state', () => {
    const a = game.addPlayer('1', 'a');
    game.start('1');
    a.board[0] = fullRowExcept(0);
    game.handleInput('1', 'drop');
    expect(game.status).toBe('ended');
    expect(game.winner).toBeNull();
    const state = game.stateFor('1');
    expect(state).toMatchObject({ room: 'room', status: 'ended', host: 'a', me: 'a', alive: false });
    expect(state.players[0].spectrum).toHaveLength(10);
    expect(game.stateFor('ghost')).toMatchObject({ me: null, board: null });
  });

  it('stops ticking when the room empties', () => {
    game.addPlayer('1', 'a');
    game.start('1');
    game.removePlayer('1');
    const before = changes;
    vi.advanceTimersByTime(5000);
    expect(changes).toBe(before);
  });
});

describe('bonus: ghost, invisible, preview, scoring, modes', () => {
  afterEach(() => vi.useRealTimers());

  it('pure helpers: dropY, hideStack, preview', () => {
    const board = emptyBoard();
    board[19][4] = 'red';
    board[18][0] = PENALTY;
    expect(dropY(board, SHAPES.O.matrix, 4, 0)).toBe(17);
    expect(dropY(board, SHAPES.O.matrix, 6, 0)).toBe(18);
    const hidden = hideStack(board);
    expect(hidden[19][4]).toBe(EMPTY);
    expect(hidden[18][0]).toBe(PENALTY);
    expect(preview('I')).toEqual([['cyan', 'cyan', 'cyan', 'cyan']]);
    expect(preview('T')).toEqual([[EMPTY, 'purple', EMPTY], ['purple', 'purple', 'purple']]);
  });

  it('draws a ghost where the piece lands, and hides stack + ghost in invisible mode', () => {
    const p = new Player('1', 'a');
    p.board[19][0] = 'red';
    p.spawn('O');
    expect(p.view()[19][4]).toBe(GHOST);
    expect(p.view()[0][4]).toBe('yellow');
    const invisible = p.view(true);
    expect(invisible[19][4]).toBe(EMPTY);
    expect(invisible[19][0]).toBe(EMPTY);
    expect(invisible[0][4]).toBe('yellow');
    p.piece = null;
    expect(p.view(true)[19][0]).toBe(EMPTY);
  });

  it('scores cleared lines and reports the end of the game', () => {
    vi.useFakeTimers();
    const ended = vi.fn();
    const game = new Game('room', () => {}, ended);
    const a = game.addPlayer('1', 'a');
    game.start('1');
    a.board[18] = fullRowExcept(4, 5);
    a.board[19] = fullRowExcept(4, 5);
    a.piece = new Piece('O');
    game.handleInput('1', 'drop');
    expect(a.score).toBe(POINTS[2]);
    expect(game.stateFor('1')).toMatchObject({ score: 100, mode: 'classic' });
    expect(game.stateFor('1').next).toEqual(preview(game['sequence'][a.pieceIndex]));
    a.board[0] = fullRowExcept(0);
    game.handleInput('1', 'drop');
    expect(ended).toHaveBeenCalledWith(game);
    expect(game.stateFor('1').next).toBeNull();
    game.start('1');
    expect(a.score).toBe(0);
    game.stop();
  });

  it('runs the selected mode: faster gravity, invisible board', () => {
    vi.useFakeTimers();
    const game = new Game('room', () => {});
    const a = game.addPlayer('1', 'a');
    game.start('1', 'gravity');
    a.piece = new Piece('O');
    vi.advanceTimersByTime(MODES.gravity * 3);
    expect(a.piece.y).toBe(3);
    game.removePlayer('1');
    const b = game.addPlayer('2', 'b');
    game.start('2', 'invisible');
    b.board[19][0] = 'red';
    expect(game.stateFor('2').board![19][0]).toBe(EMPTY);
    game.stop();
  });
});
