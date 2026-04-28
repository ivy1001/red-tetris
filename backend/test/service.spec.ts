import { GameService } from '../src/game/game.service';

const makeFakeIo = (): any => {
  const emit = jest.fn();
  return {
    emit,
    to: jest.fn(() => ({ emit })),
  };
};

describe('GameService', () => {
  let svc: GameService;
  let io: any;

  beforeEach(() => {
    svc = new GameService();
    io = makeFakeIo();
    svc.setServer(io);
  });

  afterEach(() => {
    svc.listGames().forEach((g) => g.stop());
  });

  it('joinRoom rejects when service has no io configured', () => {
    const fresh = new GameService();
    const r = fresh.joinRoom('A', 'alice', 's1');
    expect(r.ok).toBe(false);
  });

  it('joinRoom rejects missing room or name', () => {
    expect(svc.joinRoom('', 'alice', 's1').ok).toBe(false);
    expect(svc.joinRoom('A', '', 's1').ok).toBe(false);
  });

  it('joinRoom rejects when game is already playing', () => {
    svc.joinRoom('A', 'alice', 's1');
    svc.startGame('A', 's1');
    const r = svc.joinRoom('A', 'bob', 's2');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/in progress/i);
  });

  it('joinRoom rejects duplicate name', () => {
    svc.joinRoom('A', 'alice', 's1');
    const r = svc.joinRoom('A', 'alice', 's2');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/taken/i);
  });

  it('leaveRoom of unknown socket returns empty result', () => {
    const r = svc.leaveRoom('nonexistent');
    expect(r).toEqual({});
  });

  it('startGame rejects unknown room', () => {
    const r = svc.startGame('Z', 's1');
    expect(r.ok).toBe(false);
  });

  it('restartGame rejects unknown room and non-host', () => {
    expect(svc.restartGame('Z', 's1').ok).toBe(false);
    svc.joinRoom('A', 'alice', 's1');
    svc.joinRoom('A', 'bob', 's2');
    expect(svc.restartGame('A', 's2').ok).toBe(false);
  });

  it('handleInput on unknown room is a no-op', () => {
    expect(() => svc.handleInput('Z', 's1', 'left')).not.toThrow();
  });

  it('forceStartGame succeeds without host check and broadcasts', () => {
    svc.joinRoom('A', 'alice', 's1');
    const r = svc.forceStartGame('A');
    expect(r.ok).toBe(true);
    expect(io.to).toHaveBeenCalledWith('A');
  });

  it('forceStartGame rejects unknown room', () => {
    expect(svc.forceStartGame('Z').ok).toBe(false);
  });

  it('forceStartGame rejects empty room', () => {
    svc.joinRoom('A', 'alice', 's1');
    svc.leaveRoom('s1');
    expect(svc.forceStartGame('A').ok).toBe(false);
  });

  it('forceRestartGame stops a running game and starts a new one', () => {
    svc.joinRoom('A', 'alice', 's1');
    svc.startGame('A', 's1');
    const game = svc.getGame('A')!;
    expect(game.status).toBe('playing');
    const r = svc.forceRestartGame('A');
    expect(r.ok).toBe(true);
    expect(game.status).toBe('playing');
  });

  it('forceRestartGame rejects unknown room', () => {
    expect(svc.forceRestartGame('Z').ok).toBe(false);
  });

  it('destroyRoom removes the room and notifies clients', () => {
    svc.joinRoom('A', 'alice', 's1');
    const r = svc.destroyRoom('A');
    expect(r.ok).toBe(true);
    expect(svc.getGame('A')).toBeUndefined();
    expect(io.to).toHaveBeenCalledWith('A');
  });

  it('destroyRoom rejects unknown room', () => {
    expect(svc.destroyRoom('Z').ok).toBe(false);
  });

  it('listGames returns every active game', () => {
    svc.joinRoom('A', 'alice', 's1');
    svc.joinRoom('B', 'bob', 's2');
    expect(svc.listGames()).toHaveLength(2);
  });
});
