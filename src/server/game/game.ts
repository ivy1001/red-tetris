import { Player } from './player';
import { PIECE_TYPES, POINTS, PieceType, preview } from './tetris';

export type GameStatus = 'waiting' | 'playing' | 'ended';
export type Input = 'left' | 'right' | 'rotate' | 'down' | 'drop';

// Bonus game modes -> gravity tick in ms. Invisible: locked blocks are hidden from their owner.
export const MODES = { classic: 500, invisible: 500, gravity: 150 };
export type Mode = keyof typeof MODES;

export class GameError extends Error {}

export class Game {
  players: Player[] = [];
  status: GameStatus = 'waiting';
  winner: string | null = null;
  mode: Mode = 'classic';
  private sequence: PieceType[] = [];
  private solo = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    readonly room: string,
    private readonly onChange: (game: Game) => void,
    private readonly onEnd: (game: Game) => void = () => {},
  ) {}

  // First player in is host; when they leave, the next in line inherits it.
  get host(): Player | undefined {
    return this.players[0];
  }

  addPlayer(id: string, name: string): Player {
    if (this.status === 'playing') throw new GameError('Game already started, wait for the next round');
    if (this.players.some((p) => p.name === name)) throw new GameError(`Name "${name}" is taken in this room`);
    const player = new Player(id, name);
    this.players.push(player);
    this.onChange(this);
    return player;
  }

  removePlayer(id: string): void {
    this.players = this.players.filter((p) => p.id !== id);
    if (this.players.length === 0) {
      this.stop();
      this.status = 'waiting';
    } else if (this.status === 'playing') this.checkEnd();
    this.onChange(this);
  }

  start(byId: string, mode: Mode = 'classic'): void {
    if (this.host?.id !== byId) throw new GameError('Only the host can start the game');
    if (this.status === 'playing') throw new GameError('Game already running');
    this.sequence = [];
    this.winner = null;
    this.mode = mode;
    this.solo = this.players.length === 1;
    this.status = 'playing';
    this.players.forEach((p) => {
      p.reset();
      this.spawnNext(p);
    });
    this.timer = setInterval(() => this.tick(), MODES[mode]);
    this.onChange(this);
  }

  handleInput(id: string, input: Input): void {
    const p = this.players.find((pl) => pl.id === id);
    if (this.status !== 'playing' || !p?.alive) return;
    if (input === 'left') p.move(-1, 0);
    else if (input === 'right') p.move(1, 0);
    else if (input === 'rotate') p.rotate();
    else if (input === 'down') p.move(0, 1); // soft drop never locks; gravity does
    else if (input === 'drop') this.afterLock(p, p.hardDrop());
    else return;
    this.onChange(this);
  }

  // Gravity. A piece that can't fall locks on this tick, so a piece that just landed
  // stays movable until the next one (the "last-moment adjustment" frame).
  tick(): void {
    // Re-check each step: an earlier player's penalty can kill or end the game mid-tick.
    this.players.forEach((p) => {
      if (this.status === 'playing' && p.alive && !p.move(0, 1)) this.afterLock(p, p.lock());
    });
    this.onChange(this);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  // Everyone draws from the same sequence, each at their own pace.
  private pieceAt(i: number): PieceType {
    while (this.sequence.length <= i)
      this.sequence.push(PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)]);
    return this.sequence[i];
  }

  private spawnNext(p: Player): void {
    p.spawn(this.pieceAt(p.pieceIndex));
  }

  private afterLock(p: Player, cleared: number): void {
    p.score += POINTS[cleared];
    if (cleared > 1)
      this.players.filter((o) => o !== p && o.alive).forEach((o) => o.receivePenalty(cleared - 1));
    if (p.alive) this.spawnNext(p);
    this.checkEnd();
  }

  private checkEnd(): void {
    const alive = this.players.filter((p) => p.alive);
    if (this.status !== 'playing' || alive.length > (this.solo ? 0 : 1)) return;
    this.status = 'ended';
    this.winner = this.solo ? null : (alive[0]?.name ?? null);
    this.stop();
    this.onEnd(this);
  }

  // What one client gets: its own board and next piece + everyone's name/spectrum/score.
  stateFor(id: string) {
    const me = this.players.find((p) => p.id === id);
    return {
      room: this.room,
      status: this.status,
      host: this.host?.name ?? null,
      winner: this.winner,
      mode: this.mode,
      me: me?.name ?? null,
      alive: me?.alive ?? false,
      score: me?.score ?? 0,
      board: me?.view(this.mode === 'invisible') ?? null,
      next: me?.alive && this.status === 'playing' ? preview(this.pieceAt(me.pieceIndex)) : null,
      players: this.players.map((p) => ({ name: p.name, alive: p.alive, score: p.score, spectrum: p.spectrum() })),
    };
  }
}
