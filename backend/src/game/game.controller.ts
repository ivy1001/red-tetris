import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GameService } from './game.service';
import { Game } from './entities/game.entity';
import {
  ActionResultResponseDto,
  ErrorResponseDto,
  HealthResponseDto,
  RoomSummaryResponseDto,
  RoomsListResponseDto,
} from './dto/responses.dto';

/**
 * Debug-only HTTP surface. The real game flow runs over socket.io.
 * These endpoints exist so you can inspect server state from Swagger / curl.
 */
@ApiTags('debug')
@Controller('api')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get('health')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({
    status: 200,
    description: 'Server is up',
    type: HealthResponseDto,
  })
  health(): HealthResponseDto {
    return { status: 'ok', uptime: process.uptime() };
  }

  @Get('games')
  @ApiOperation({ summary: 'List every active room' })
  @ApiResponse({
    status: 200,
    description: 'All in-memory rooms',
    type: RoomsListResponseDto,
  })
  listGames(): RoomsListResponseDto {
    const games = this.gameService.listGames();
    return {
      count: games.length,
      rooms: games.map(GameController.toRoomSummary),
    };
  }

  @Get('games/:roomName')
  @ApiOperation({ summary: 'Inspect a single room' })
  @ApiParam({ name: 'roomName', example: 'lobby-1' })
  @ApiResponse({
    status: 200,
    description: 'Room snapshot',
    type: RoomSummaryResponseDto,
  })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  getGame(@Param('roomName') roomName: string): RoomSummaryResponseDto {
    const game = this.gameService.getGame(roomName);
    if (!game) throw new NotFoundException(`Room "${roomName}" not found`);
    return GameController.toRoomSummary(game);
  }

  @Post('games/:roomName/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Force-start the game (debug only — bypasses host check)',
  })
  @ApiParam({ name: 'roomName', example: 'lobby-1' })
  @ApiResponse({ status: 200, type: ActionResultResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  startGame(
    @Param('roomName') roomName: string,
  ): ActionResultResponseDto {
    const result = this.gameService.forceStartGame(roomName);
    if (!result.ok) {
      if (result.error === 'Room not found') {
        throw new NotFoundException(result.error);
      }
      return { ok: false, message: result.error };
    }
    return { ok: true };
  }

  @Post('games/:roomName/restart')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Force-restart the game (debug only — stops current run, then starts fresh)',
  })
  @ApiParam({ name: 'roomName', example: 'lobby-1' })
  @ApiResponse({ status: 200, type: ActionResultResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  restartGame(
    @Param('roomName') roomName: string,
  ): ActionResultResponseDto {
    const result = this.gameService.forceRestartGame(roomName);
    if (!result.ok) {
      if (result.error === 'Room not found') {
        throw new NotFoundException(result.error);
      }
      return { ok: false, message: result.error };
    }
    return { ok: true };
  }

  @Delete('games/:roomName')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Destroy a room (kicks players, clears server state)',
  })
  @ApiParam({ name: 'roomName', example: 'lobby-1' })
  @ApiResponse({ status: 200, type: ActionResultResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  deleteGame(
    @Param('roomName') roomName: string,
  ): ActionResultResponseDto {
    const result = this.gameService.destroyRoom(roomName);
    if (!result.ok) {
      throw new NotFoundException(result.error);
    }
    return { ok: true };
  }

  private static toRoomSummary(game: Game): RoomSummaryResponseDto {
    const state = game.buildRoomState();
    return {
      roomName: state.roomName,
      status: state.status,
      players: state.players,
      hostId: state.hostId,
      winner: state.winner,
      sequenceLength: game.pieceSequence.length,
    };
  }
}
