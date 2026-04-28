import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status: string;

  @ApiProperty({ example: 12.345, description: 'Process uptime in seconds' })
  uptime: number;
}

export class PlayerSummaryResponseDto {
  @ApiProperty({ description: "Socket.io socket id (server-assigned)" })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  isHost: boolean;

  @ApiProperty()
  isAlive: boolean;
}

export class RoomSummaryResponseDto {
  @ApiProperty()
  roomName: string;

  @ApiProperty({ enum: ['waiting', 'playing', 'ended'] })
  status: 'waiting' | 'playing' | 'ended';

  @ApiProperty({ type: [PlayerSummaryResponseDto] })
  players: PlayerSummaryResponseDto[];

  @ApiProperty({ nullable: true, type: String })
  hostId: string | null;

  @ApiProperty({ nullable: true, type: String })
  winner: string | null;

  @ApiProperty({ description: 'Number of pieces pre-generated in the sequence' })
  sequenceLength: number;
}

export class RoomsListResponseDto {
  @ApiProperty({ type: [RoomSummaryResponseDto] })
  rooms: RoomSummaryResponseDto[];

  @ApiProperty()
  count: number;
}

export class ActionResultResponseDto {
  @ApiProperty()
  ok: boolean;

  @ApiProperty({ required: false })
  message?: string;
}

export class ErrorResponseDto {
  @ApiProperty()
  statusCode: number;

  @ApiProperty()
  message: string;
}
