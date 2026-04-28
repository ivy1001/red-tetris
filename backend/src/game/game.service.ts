import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { Game } from './entities/game.entity';
import { Player } from './entities/player.entity';
import { PlayerInput } from './types/game.types';

interface JoinResult {
  ok: boolean;
  error?: string;
  game?: Game;
}

interface LeaveResult {
  roomName?: string;
  removedPlayer?: Player;
  newHost?: Player;
  gameDestroyed?: boolean;
  gameEnded?: boolean;
}

interface GenericResult {
  ok: boolean;
  error?: string;
  game?: Game;
}

@Injectable()
export class GameService {
  private readonly games: Map<string, Game> = new Map();
  private io: Server | null = null;

  setServer(io: Server): void {
    this.io = io;
  }

  joinRoom(
    roomName: string,
    playerName: string,
    socketId: string,
  ): JoinResult {
    if (!this.io) return { ok: false, error: 'Server not ready' };
    if (!roomName || !playerName) {
      return { ok: false, error: 'Missing room or player name' };
    }

    let game = this.games.get(roomName);
    if (!game) {
      game = new Game(roomName, this.io);
      this.games.set(roomName, game);
    }

    if (game.status === 'playing') {
      return { ok: false, error: 'Game already in progress' };
    }

    const player = new Player(socketId, playerName);
    const added = game.addPlayer(player);
    if (!added) {
      if (game.isEmpty()) this.games.delete(roomName);
      return { ok: false, error: 'Player name already taken' };
    }

    return { ok: true, game };
  }

  leaveRoom(socketId: string): LeaveResult {
    for (const [roomName, game] of this.games.entries()) {
      const player = game.getPlayer(socketId);
      if (!player) continue;

      const { removedPlayer, newHost, gameEnded } =
        game.removePlayer(socketId);

      if (game.isEmpty()) {
        game.stop();
        this.games.delete(roomName);
        return {
          roomName,
          removedPlayer,
          newHost,
          gameEnded,
          gameDestroyed: true,
        };
      }
      return { roomName, removedPlayer, newHost, gameEnded };
    }
    return {};
  }

  startGame(roomName: string, socketId: string): GenericResult {
    const game = this.games.get(roomName);
    if (!game) return { ok: false, error: 'Room not found' };
    const ok = game.start(socketId);
    if (!ok) {
      return {
        ok: false,
        error: 'Cannot start game (not host or already running)',
      };
    }
    return { ok: true, game };
  }

  restartGame(roomName: string, socketId: string): GenericResult {
    const game = this.games.get(roomName);
    if (!game) return { ok: false, error: 'Room not found' };
    const ok = game.restart(socketId);
    if (!ok) {
      return {
        ok: false,
        error: 'Cannot restart game (not host or still running)',
      };
    }
    return { ok: true, game };
  }

  handleInput(
    roomName: string,
    socketId: string,
    input: PlayerInput,
  ): void {
    const game = this.games.get(roomName);
    if (!game) return;
    game.handleInput(socketId, input);
  }

  getGame(roomName: string): Game | undefined {
    return this.games.get(roomName);
  }

  // ──────────────────────────────────────────────────────
  // Admin / debug helpers (used by the HTTP controller)
  // ──────────────────────────────────────────────────────

  listGames(): Game[] {
    return Array.from(this.games.values());
  }

  forceStartGame(roomName: string): GenericResult {
    const game = this.games.get(roomName);
    if (!game) return { ok: false, error: 'Room not found' };
    const ok = game.forceStart();
    if (!ok) {
      return {
        ok: false,
        error: 'Cannot start (game already running or no players)',
      };
    }
    game.broadcastRoomState();
    game.broadcastGameStates();
    if (this.io) this.io.to(roomName).emit('game_started', {});
    return { ok: true, game };
  }

  forceRestartGame(roomName: string): GenericResult {
    const game = this.games.get(roomName);
    if (!game) return { ok: false, error: 'Room not found' };
    if (game.status === 'playing') {
      game.stop();
    }
    const ok = game.forceStart();
    if (!ok) {
      return { ok: false, error: 'Cannot restart (no players)' };
    }
    game.broadcastRoomState();
    game.broadcastGameStates();
    if (this.io) this.io.to(roomName).emit('game_started', {});
    return { ok: true, game };
  }

  destroyRoom(roomName: string): GenericResult {
    const game = this.games.get(roomName);
    if (!game) return { ok: false, error: 'Room not found' };
    game.stop();
    if (this.io) {
      this.io.to(roomName).emit('error_event', {
        message: 'Room destroyed by admin',
      });
    }
    this.games.delete(roomName);
    return { ok: true };
  }
}
