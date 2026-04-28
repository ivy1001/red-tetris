import { NotFoundException } from '@nestjs/common';
import { GameController } from '../src/game/game.controller';
import { GameService } from '../src/game/game.service';

const makeFakeIo = (): any => ({
  emit: jest.fn(),
  to: jest.fn(() => ({ emit: jest.fn() })),
});

describe('GameController', () => {
  let svc: GameService;
  let ctrl: GameController;

  beforeEach(() => {
    svc = new GameService();
    svc.setServer(makeFakeIo());
    ctrl = new GameController(svc);
  });

  afterEach(() => {
    svc.listGames().forEach((g) => g.stop());
  });

  it('GET /api/health returns ok and uptime', () => {
    const r = ctrl.health();
    expect(r.status).toBe('ok');
    expect(typeof r.uptime).toBe('number');
  });

  it('GET /api/games returns the empty list initially', () => {
    expect(ctrl.listGames()).toEqual({ count: 0, rooms: [] });
  });

  it('GET /api/games returns active rooms with player summary', () => {
    svc.joinRoom('A', 'alice', 's1');
    svc.joinRoom('B', 'bob', 's2');
    const r = ctrl.listGames();
    expect(r.count).toBe(2);
    expect(r.rooms.map((rm) => rm.roomName).sort()).toEqual(['A', 'B']);
    const a = r.rooms.find((rm) => rm.roomName === 'A')!;
    expect(a.players[0].name).toBe('alice');
    expect(a.players[0].isHost).toBe(true);
  });

  it('GET /api/games/:roomName returns the snapshot', () => {
    svc.joinRoom('A', 'alice', 's1');
    const r = ctrl.getGame('A');
    expect(r.roomName).toBe('A');
    expect(r.status).toBe('waiting');
    expect(r.players).toHaveLength(1);
  });

  it('GET /api/games/:roomName 404s when room missing', () => {
    expect(() => ctrl.getGame('Z')).toThrow(NotFoundException);
  });

  it('POST /api/games/:roomName/start force-starts the game', () => {
    svc.joinRoom('A', 'alice', 's1');
    expect(ctrl.startGame('A').ok).toBe(true);
    expect(svc.getGame('A')!.status).toBe('playing');
  });

  it('POST /api/games/:roomName/start 404s on unknown room', () => {
    expect(() => ctrl.startGame('Z')).toThrow(NotFoundException);
  });

  it('POST /api/games/:roomName/start returns ok=false when empty', () => {
    svc.joinRoom('A', 'alice', 's1');
    svc.leaveRoom('s1');
    expect(() => ctrl.startGame('A')).toThrow(NotFoundException);
  });

  it('POST /api/games/:roomName/restart starts a fresh round', () => {
    svc.joinRoom('A', 'alice', 's1');
    svc.startGame('A', 's1');
    const r = ctrl.restartGame('A');
    expect(r.ok).toBe(true);
  });

  it('POST /api/games/:roomName/restart 404s on unknown room', () => {
    expect(() => ctrl.restartGame('Z')).toThrow(NotFoundException);
  });

  it('DELETE /api/games/:roomName destroys the room', () => {
    svc.joinRoom('A', 'alice', 's1');
    const r = ctrl.deleteGame('A');
    expect(r.ok).toBe(true);
    expect(svc.getGame('A')).toBeUndefined();
  });

  it('DELETE /api/games/:roomName 404s on unknown room', () => {
    expect(() => ctrl.deleteGame('Z')).toThrow(NotFoundException);
  });
});
