import { GameGateway } from '../src/game/game.gateway';
import { GameService } from '../src/game/game.service';

interface MockClient {
  id: string;
  emit: jest.Mock;
  join: jest.Mock;
}

const makeClient = (id: string): MockClient => ({
  id,
  emit: jest.fn(),
  join: jest.fn(),
});

const makeFakeIo = (): any => {
  const emit = jest.fn();
  return {
    emit,
    to: jest.fn(() => ({ emit })),
  };
};

describe('GameGateway', () => {
  let svc: GameService;
  let gw: GameGateway;
  let io: any;

  beforeEach(() => {
    svc = new GameService();
    io = makeFakeIo();
    gw = new GameGateway(svc);
    gw.io = io;
    gw.afterInit(io);
  });

  afterEach(() => {
    svc.listGames().forEach((g) => g.stop());
  });

  it('handleConnection is a no-op', () => {
    expect(() => gw.handleConnection(makeClient('s1') as any)).not.toThrow();
  });

  it('join_room: success joins the socket to the room and broadcasts state', () => {
    const c = makeClient('s1');
    gw.onJoin({ roomName: 'A', playerName: 'alice' }, c as any);
    expect(c.join).toHaveBeenCalledWith('A');
    expect(io.to).toHaveBeenCalledWith('A');
  });

  it('join_room: bad payload emits error_event back to caller', () => {
    const c = makeClient('s1');
    gw.onJoin({ roomName: '', playerName: '' } as any, c as any);
    expect(c.emit).toHaveBeenCalledWith(
      'error_event',
      expect.objectContaining({ message: expect.any(String) }),
    );
    expect(c.join).not.toHaveBeenCalled();
  });

  it('start_game: missing roomName emits error', () => {
    const c = makeClient('s1');
    gw.onStart({} as any, c as any);
    expect(c.emit).toHaveBeenCalledWith(
      'error_event',
      expect.objectContaining({ message: 'Missing roomName' }),
    );
  });

  it('start_game: non-host emits error', () => {
    const a = makeClient('s1');
    const b = makeClient('s2');
    gw.onJoin({ roomName: 'A', playerName: 'alice' }, a as any);
    gw.onJoin({ roomName: 'A', playerName: 'bob' }, b as any);
    gw.onStart({ roomName: 'A' }, b as any); // bob is not host
    expect(b.emit).toHaveBeenCalledWith(
      'error_event',
      expect.objectContaining({ message: expect.any(String) }),
    );
  });

  it('start_game: host succeeds and emits game_started + state', () => {
    const a = makeClient('s1');
    gw.onJoin({ roomName: 'A', playerName: 'alice' }, a as any);
    io.to.mockClear();
    gw.onStart({ roomName: 'A' }, a as any);
    expect(io.to).toHaveBeenCalledWith('A');
    expect(svc.getGame('A')!.status).toBe('playing');
  });

  it('restart_game: missing roomName emits error', () => {
    const c = makeClient('s1');
    gw.onRestart({} as any, c as any);
    expect(c.emit).toHaveBeenCalledWith(
      'error_event',
      expect.objectContaining({ message: 'Missing roomName' }),
    );
  });

  it('restart_game: unknown room emits error', () => {
    const c = makeClient('s1');
    gw.onRestart({ roomName: 'Z' }, c as any);
    expect(c.emit).toHaveBeenCalledWith(
      'error_event',
      expect.any(Object),
    );
  });

  it('player_input: empty payload is silently ignored', () => {
    const c = makeClient('s1');
    expect(() => gw.onInput({} as any, c as any)).not.toThrow();
    expect(c.emit).not.toHaveBeenCalled();
  });

  it('player_input: forwards valid input to the service', () => {
    const a = makeClient('s1');
    gw.onJoin({ roomName: 'A', playerName: 'alice' }, a as any);
    gw.onStart({ roomName: 'A' }, a as any);
    const piece = svc.getGame('A')!.getPlayer('s1')!.currentPiece!;
    const beforeX = piece.x;
    gw.onInput({ roomName: 'A', input: 'left' }, a as any);
    expect(svc.getGame('A')!.getPlayer('s1')!.currentPiece!.x).toBe(
      beforeX - 1,
    );
  });

  it('handleDisconnect on unknown socket is a no-op', () => {
    expect(() =>
      gw.handleDisconnect(makeClient('ghost') as any),
    ).not.toThrow();
  });

  it('handleDisconnect promotes new host and broadcasts host_changed', () => {
    const a = makeClient('s1');
    const b = makeClient('s2');
    gw.onJoin({ roomName: 'A', playerName: 'alice' }, a as any);
    gw.onJoin({ roomName: 'A', playerName: 'bob' }, b as any);
    io.to.mockClear();
    gw.handleDisconnect(a as any);
    expect(io.to).toHaveBeenCalledWith('A');
    // a host_changed emit happened on the room channel
    const calls = io.to.mock.calls.flat();
    expect(calls).toContain('A');
  });
});
