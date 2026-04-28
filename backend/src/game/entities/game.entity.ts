import { Server } from 'socket.io';
import {
  COLS,
  EMPTY_CELL,
  PENALTY_CELL,
  Player,
  ROWS,
} from './player.entity';
import { Piece } from './piece.entity';
import {
  GameStateDto,
  GameStatus,
  PieceType,
  PlayerInput,
  RoomStateDto,
} from '../types/game.types';

const DEFAULT_TICK_MS = 500;
const INITIAL_SEQUENCE_SIZE = 50;

export class Game {
  roomName: string;
  players: Player[];
  status: GameStatus;
  pieceSequence: PieceType[];
  winner: string | null;

  private io: Server;
  private tickHandle: NodeJS.Timeout | null;
  private tickMs: number;
  private startedMultiplayer: boolean;

  constructor(roomName: string, io: Server, tickMs = DEFAULT_TICK_MS) {
    this.roomName = roomName;
    this.players = [];
    this.status = 'waiting';
    this.pieceSequence = [];
    this.winner = null;
    this.io = io;
    this.tickHandle = null;
    this.tickMs = tickMs;
    this.startedMultiplayer = false;
  }

  // ──────────────────────────────────────────────────────
  // Player management
  // ──────────────────────────────────────────────────────

  addPlayer(player: Player): boolean {
    if (this.status === 'playing') return false;
    if (this.players.some((p) => p.name === player.name)) return false;
    if (this.players.length === 0) player.isHost = true;
    this.players.push(player);
    return true;
  }

  removePlayer(playerId: string): {
    removedPlayer?: Player;
    newHost?: Player;
    gameEnded?: boolean;
  } {
    const idx = this.players.findIndex((p) => p.id === playerId);
    if (idx === -1) return {};
    const removed = this.players.splice(idx, 1)[0];

    let newHost: Player | undefined;
    if (removed.isHost && this.players.length > 0) {
      this.players[0].isHost = true;
      newHost = this.players[0];
    }

    let gameEnded = false;
    if (this.status === 'playing') {
      gameEnded = this.checkGameOver();
    }

    return { removedPlayer: removed, newHost, gameEnded };
  }

  isEmpty(): boolean {
    return this.players.length === 0;
  }

  getPlayer(id: string): Player | undefined {
    return this.players.find((p) => p.id === id);
  }

  // ──────────────────────────────────────────────────────
  // Game lifecycle
  // ──────────────────────────────────────────────────────

  start(playerId: string): boolean {
    const requester = this.getPlayer(playerId);
    if (!requester || !requester.isHost) return false;
    return this.beginGame();
  }

  restart(playerId: string): boolean {
    const requester = this.getPlayer(playerId);
    if (!requester || !requester.isHost) return false;
    return this.beginGame();
  }

  forceStart(): boolean {
    return this.beginGame();
  }

  private beginGame(): boolean {
    if (this.status === 'playing') return false;
    if (this.players.length === 0) return false;

    this.pieceSequence = [];
    this.fillSequenceUpTo(INITIAL_SEQUENCE_SIZE);
    this.winner = null;
    this.startedMultiplayer = this.players.length > 1;

    for (const p of this.players) {
      p.reset();
      p.isAlive = true;
      p.currentPiece = this.spawnFromSequence(0);
      p.pieceIndex = 1;
    }

    this.status = 'playing';
    this.startTick();
    return true;
  }

  stop(): void {
    this.stopTick();
    this.status = 'ended';
  }

  // ──────────────────────────────────────────────────────
  // Tick loop
  // ──────────────────────────────────────────────────────

  tick(): void {
    if (this.status !== 'playing') return;

    for (const player of this.players) {
      if (!player.isAlive || !player.currentPiece) continue;

      const moved = player.currentPiece.moved(0, 1);
      if (this.canPlace(player.board, moved)) {
        player.currentPiece = moved;
        player.touchingGround = false;
      } else if (player.touchingGround) {
        this.lockPiece(player);
      } else {
        player.touchingGround = true;
      }
    }

    this.broadcastGameStates();
    this.checkGameOver();
  }

  private startTick(): void {
    this.stopTick();
    this.tickHandle = setInterval(() => this.tick(), this.tickMs);
  }

  private stopTick(): void {
    if (this.tickHandle) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
  }

  // ──────────────────────────────────────────────────────
  // Inputs
  // ──────────────────────────────────────────────────────

  handleInput(playerId: string, input: PlayerInput): void {
    if (this.status !== 'playing') return;
    const player = this.getPlayer(playerId);
    if (!player || !player.isAlive || !player.currentPiece) return;

    switch (input) {
      case 'left':
        this.tryMove(player, -1, 0);
        break;
      case 'right':
        this.tryMove(player, 1, 0);
        break;
      case 'rotate':
        this.tryRotate(player);
        break;
      case 'soft_drop':
        this.softDrop(player);
        break;
      case 'hard_drop':
        this.hardDrop(player);
        break;
    }

    this.broadcastGameStates();
    this.checkGameOver();
  }

  private tryMove(player: Player, dx: number, dy: number): void {
    if (!player.currentPiece) return;
    const next = player.currentPiece.moved(dx, dy);
    if (this.canPlace(player.board, next)) {
      player.currentPiece = next;
    }
  }

  private tryRotate(player: Player): void {
    if (!player.currentPiece) return;
    const next = player.currentPiece.rotated();
    if (this.canPlace(player.board, next)) {
      player.currentPiece = next;
    }
  }

  private softDrop(player: Player): void {
    if (!player.currentPiece) return;
    const next = player.currentPiece.moved(0, 1);
    if (this.canPlace(player.board, next)) {
      player.currentPiece = next;
      player.touchingGround = false;
    } else if (player.touchingGround) {
      this.lockPiece(player);
    } else {
      player.touchingGround = true;
    }
  }

  private hardDrop(player: Player): void {
    if (!player.currentPiece) return;
    let piece = player.currentPiece;
    while (this.canPlace(player.board, piece.moved(0, 1))) {
      piece = piece.moved(0, 1);
    }
    player.currentPiece = piece;
    this.lockPiece(player);
  }

  // ──────────────────────────────────────────────────────
  // Collision / placement
  // ──────────────────────────────────────────────────────

  canPlace(board: number[][], piece: Piece): boolean {
    const matrix = piece.getMatrix();
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c] === 0) continue;
        const x = piece.x + c;
        const y = piece.y + r;
        if (x < 0 || x >= COLS) return false;
        if (y >= ROWS) return false;
        if (y < 0) continue;
        if (board[y][x] !== EMPTY_CELL) return false;
      }
    }
    return true;
  }

  // ──────────────────────────────────────────────────────
  // Lock + line clear + penalty
  // ──────────────────────────────────────────────────────

  private lockPiece(player: Player): void {
    if (!player.currentPiece) return;

    const matrix = player.currentPiece.getMatrix();
    const color = player.currentPiece.getColor();
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c] === 0) continue;
        const x = player.currentPiece.x + c;
        const y = player.currentPiece.y + r;
        if (y < 0 || y >= ROWS || x < 0 || x >= COLS) continue;
        player.board[y][x] = color;
      }
    }

    const cleared = this.clearLines(player.board);

    if (cleared > 1) {
      const penalty = cleared - 1;
      for (const other of this.players) {
        if (other.id === player.id || !other.isAlive) continue;
        this.addPenaltyLines(other, penalty);
      }
    }

    const next = this.spawnFromSequence(player.pieceIndex);
    player.pieceIndex += 1;
    player.touchingGround = false;

    if (this.canPlace(player.board, next)) {
      player.currentPiece = next;
    } else {
      player.currentPiece = null;
      player.isAlive = false;
    }
  }

  private clearLines(board: number[][]): number {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      const row = board[r];
      const hasPenalty = row.some((cell) => cell === PENALTY_CELL);
      const isFull = row.every((cell) => cell !== EMPTY_CELL);
      if (isFull && !hasPenalty) {
        board.splice(r, 1);
        board.unshift(new Array(COLS).fill(EMPTY_CELL));
        cleared += 1;
        r += 1;
      }
    }
    return cleared;
  }

  private addPenaltyLines(player: Player, count: number): void {
    for (let i = 0; i < count; i++) {
      player.board.shift();
      player.board.push(new Array(COLS).fill(PENALTY_CELL));
    }

    if (player.currentPiece && !this.canPlace(player.board, player.currentPiece)) {
      let lifted = player.currentPiece;
      const minY = -lifted.getMatrix().length;
      while (lifted.y > minY && !this.canPlace(player.board, lifted)) {
        lifted = lifted.moved(0, -1);
      }
      if (this.canPlace(player.board, lifted)) {
        player.currentPiece = lifted;
      } else {
        player.currentPiece = null;
        player.isAlive = false;
      }
    }
  }

  // ──────────────────────────────────────────────────────
  // Piece sequence
  // ──────────────────────────────────────────────────────

  private fillSequenceUpTo(size: number): void {
    while (this.pieceSequence.length < size) {
      this.pieceSequence.push(Piece.randomType());
    }
  }

  private spawnFromSequence(idx: number): Piece {
    this.fillSequenceUpTo(idx + 1);
    const type = this.pieceSequence[idx];
    return new Piece(type);
  }

  // ──────────────────────────────────────────────────────
  // Game over
  // ──────────────────────────────────────────────────────

  checkGameOver(): boolean {
    if (this.status !== 'playing') return false;
    const alive = this.players.filter((p) => p.isAlive);

    if (this.players.length === 0) {
      this.endGame(null);
      return true;
    }

    // True solo mode (started with 1) — only ends on death.
    if (!this.startedMultiplayer) {
      if (alive.length === 0) {
        this.endGame(null);
        return true;
      }
      return false;
    }

    // Multiplayer (started with 2+) — ends when at most 1 survivor remains,
    // whether the others died or disconnected.
    if (alive.length <= 1) {
      this.endGame(alive[0]?.name ?? null);
      return true;
    }
    return false;
  }

  private endGame(winner: string | null): void {
    this.stopTick();
    this.status = 'ended';
    this.winner = winner;
    this.io.to(this.roomName).emit('game_over', { winner });
    this.broadcastRoomState();
    this.broadcastGameStates();
  }

  // ──────────────────────────────────────────────────────
  // Broadcast helpers
  // ──────────────────────────────────────────────────────

  broadcastRoomState(): void {
    this.io.to(this.roomName).emit('room_state', this.buildRoomState());
  }

  broadcastGameStates(): void {
    for (const player of this.players) {
      this.io.to(player.id).emit('game_state', this.buildGameState(player));
    }
  }

  buildRoomState(): RoomStateDto {
    return {
      roomName: this.roomName,
      status: this.status,
      hostId: this.players.find((p) => p.isHost)?.id ?? null,
      winner: this.winner,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        isAlive: p.isAlive,
      })),
    };
  }

  buildGameState(player: Player): GameStateDto {
    const opponents = this.players
      .filter((p) => p.id !== player.id)
      .map((p) => ({
        id: p.id,
        name: p.name,
        isAlive: p.isAlive,
        spectrum: p.getSpectrum(),
      }));

    return {
      status: this.status,
      isAlive: player.isAlive,
      board: player.board.map((row) => [...row]),
      currentPiece: player.currentPiece
        ? {
            type: player.currentPiece.type,
            rotation: player.currentPiece.rotation,
            x: player.currentPiece.x,
            y: player.currentPiece.y,
            matrix: player.currentPiece.getMatrix(),
            color: player.currentPiece.getColor(),
          }
        : null,
      opponents,
    };
  }
}
