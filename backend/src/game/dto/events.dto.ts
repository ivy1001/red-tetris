import { PlayerInput } from '../types/game.types';

export class JoinRoomDto {
  roomName: string;
  playerName: string;
}

export class StartGameDto {
  roomName: string;
  playerId?: string;
}

export class RestartGameDto {
  roomName: string;
  playerId?: string;
}

export class PlayerInputDto {
  roomName: string;
  playerId?: string;
  input: PlayerInput;
}
