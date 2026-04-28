export type GameStatus = 'waiting' | 'playing' | 'ended';

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

export interface RoomStateDto {
  roomName: string;
  status: GameStatus;
  players: PlayerSummary[];
  hostId: string | null;
  winner: string | null;
}

export interface GameStateDto {
  status: GameStatus;
  isAlive: boolean;
  board: number[][];
  currentPiece: CurrentPieceDto | null;
  opponents: OpponentSummary[];
}

export interface GameOverDto {
  winner: string | null;
}

export interface HostChangedDto {
  newHostId: string;
  newHostName: string;
}

export interface ErrorEventDto {
  message: string;
}
