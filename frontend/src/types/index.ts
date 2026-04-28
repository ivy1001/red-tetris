export type GameStatus = 'idle' | 'waiting' | 'playing' | 'ended';

export type PlayerInput =
  | 'left'
  | 'right'
  | 'rotate'
  | 'soft_drop'
  | 'hard_drop';

export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export interface PlayerSummary {
  id: string;
  name: string;
  isHost: boolean;
  isAlive: boolean;
}

export interface OpponentSummary {
  id: string;
  name: string;
  isAlive: boolean;
  spectrum: number[];
}

export interface CurrentPieceDto {
  type: PieceType;
  rotation: number;
  x: number;
  y: number;
  matrix: number[][];
  color: number;
}

export interface RoomStatePayload {
  roomName: string;
  status: GameStatus;
  players: PlayerSummary[];
  hostId: string | null;
  winner: string | null;
}

export interface GameStatePayload {
  status: GameStatus;
  isAlive: boolean;
  board: number[][];
  currentPiece: CurrentPieceDto | null;
  opponents: OpponentSummary[];
}

export interface GameOverPayload {
  winner: string | null;
}

export interface HostChangedPayload {
  newHostId: string;
  newHostName: string;
}

export interface ErrorPayload {
  message: string;
}
