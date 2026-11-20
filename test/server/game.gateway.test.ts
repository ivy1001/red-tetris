import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { Socket } from 'socket.io';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { GameGateway } from '../../src/server/game/game.gateway';
import { ScoreBoard } from '../../src/server/scores';

const socket = (id: string) => ({ id, data: {} }) as unknown as Socket;

describe('GameGateway', () => {
  let gw: GameGateway;
  let emit: Mock;
  beforeEach(() => {
    vi.useFakeTimers();
    process.env.SCORES_FILE = join(mkdtempSync(join(tmpdir(), 'gw-')), 'scores.json');
    gw = new GameGateway(new ScoreBoard());
    emit = vi.fn();
    gw.server = { to: vi.fn(() => ({ emit })) } as never;
  });
  afterEach(() => {
    gw.games.forEach((g) => g.stop());
    vi.useRealTimers();
    delete process.env.SCORES_FILE;
  });

  it('validates join payloads', () => {
    const s = socket('1');
    expect(gw.join(s, { room: '', name: 'a' })).toMatchObject({ event: 'game_error' });
    expect(gw.join(s, { room: 'r', name: '../x' })).toMatchObject({ event: 'game_error' });
    expect(gw.join(s, undefined as never)).toMatchObject({ event: 'game_error' });
  });

  it('joins, broadcasts state and refuses a second room', () => {
    const s = socket('1');
    expect(gw.join(s, { room: 'r', name: 'alice' })).toBeUndefined();
    expect(emit).toHaveBeenCalledWith('state', expect.objectContaining({ room: 'r', me: 'alice', host: 'alice' }));
    expect(gw.join(s, { room: 'r2', name: 'alice' })).toMatchObject({ data: { message: 'Already in a room' } });
  });

  it('reports game errors and does not create a room for a refused join', () => {
    gw.join(socket('1'), { room: 'r', name: 'alice' });
    expect(gw.join(socket('2'), { room: 'r', name: 'alice' })).toMatchObject({ event: 'game_error' });
    expect(gw.games.get('r')!.players).toHaveLength(1);
  });

  it('starts only for the host of a joined room', () => {
    const host = socket('1');
    const guest = socket('2');
    expect(gw.start(host)).toMatchObject({ data: { message: 'Join a room first' } });
    gw.join(host, { room: 'r', name: 'a' });
    gw.join(guest, { room: 'r', name: 'b' });
    expect(gw.start(guest)).toMatchObject({ event: 'game_error' });
    expect(gw.start(host)).toBeUndefined();
    expect(gw.games.get('r')!.status).toBe('playing');
  });

  it('forwards only known inputs', () => {
    const s = socket('1');
    gw.join(s, { room: 'r', name: 'a' });
    gw.start(s);
    const game = gw.games.get('r')!;
    const spy = vi.spyOn(game, 'handleInput');
    gw.input(s, 'nope' as never);
    gw.input(s, 'left');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('1', 'left');
  });

  it('removes players on leave/disconnect and deletes empty rooms', () => {
    const a = socket('1');
    const b = socket('2');
    gw.join(a, { room: 'r', name: 'a' });
    gw.join(b, { room: 'r', name: 'b' });
    gw.handleDisconnect(a);
    expect(gw.games.get('r')!.host!.name).toBe('b');
    gw.handleDisconnect(b);
    expect(gw.games.has('r')).toBe(false);
    gw.handleDisconnect(b); // already gone: no-op
  });

  it('starts in the requested mode, falling back to classic for unknown ones', () => {
    const s = socket('1');
    gw.join(s, { room: 'r', name: 'a' });
    gw.start(s, 'gravity');
    const game = gw.games.get('r')!;
    expect(game.mode).toBe('gravity');
    game.stop();
    game.status = 'ended';
    gw.start(s, 'nope' as never);
    expect(game.mode).toBe('classic');
    for (const bad of ['toString', '__proto__', { a: 1 }]) {
      game.stop();
      game.status = 'ended';
      gw.start(s, bad as never);
      expect(game.mode).toBe('classic');
    }
    game.stop();
  });

  it('records scores when a round ends and serves the best scores', () => {
    const s = socket('1');
    gw.join(s, { room: 'r', name: 'alice' });
    gw.start(s);
    const game = gw.games.get('r')!;
    const alice = game.players[0];
    alice.score = 300;
    alice.board[0] = Array(10).fill('red').map((c, i) => (i === 0 ? 'empty' : c));
    gw.input(s, 'drop');
    expect(game.status).toBe('ended');
    expect(gw.topScores()).toMatchObject({ event: 'scores', data: [{ name: 'alice', score: 300, mode: 'classic' }] });
  });
});
