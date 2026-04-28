import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import {
  JoinRoomDto,
  PlayerInputDto,
  RestartGameDto,
  StartGameDto,
} from './dto/events.dto';

@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() io: Server;

  constructor(private readonly gameService: GameService) {}

  afterInit(server: Server): void {
    this.gameService.setServer(server);
  }

  handleConnection(_client: Socket): void {
    // no-op; clients identify themselves on join_room
  }

  handleDisconnect(client: Socket): void {
    const result = this.gameService.leaveRoom(client.id);
    if (!result.roomName) return;
    if (result.gameDestroyed) return;

    if (result.newHost) {
      this.io.to(result.roomName).emit('host_changed', {
        newHostId: result.newHost.id,
        newHostName: result.newHost.name,
      });
    }

    // If the disconnect already ended the game, endGame already broadcast
    // room_state + game_state + game_over. Don't re-broadcast.
    if (result.gameEnded) return;

    const game = this.gameService.getGame(result.roomName);
    if (game) {
      game.broadcastRoomState();
      if (game.status === 'playing') {
        game.broadcastGameStates();
      }
    }
  }

  @SubscribeMessage('join_room')
  onJoin(
    @MessageBody() data: JoinRoomDto,
    @ConnectedSocket() client: Socket,
  ): void {
    const result = this.gameService.joinRoom(
      data?.roomName,
      data?.playerName,
      client.id,
    );
    if (!result.ok || !result.game) {
      client.emit('error_event', { message: result.error });
      return;
    }
    client.join(data.roomName);
    result.game.broadcastRoomState();
  }

  @SubscribeMessage('start_game')
  onStart(
    @MessageBody() data: StartGameDto,
    @ConnectedSocket() client: Socket,
  ): void {
    if (!data?.roomName) {
      client.emit('error_event', { message: 'Missing roomName' });
      return;
    }
    const result = this.gameService.startGame(data.roomName, client.id);
    if (!result.ok || !result.game) {
      client.emit('error_event', { message: result.error });
      return;
    }
    this.io.to(data.roomName).emit('game_started', {});
    result.game.broadcastRoomState();
    result.game.broadcastGameStates();
  }

  @SubscribeMessage('restart_game')
  onRestart(
    @MessageBody() data: RestartGameDto,
    @ConnectedSocket() client: Socket,
  ): void {
    if (!data?.roomName) {
      client.emit('error_event', { message: 'Missing roomName' });
      return;
    }
    const result = this.gameService.restartGame(data.roomName, client.id);
    if (!result.ok || !result.game) {
      client.emit('error_event', { message: result.error });
      return;
    }
    this.io.to(data.roomName).emit('game_started', {});
    result.game.broadcastRoomState();
    result.game.broadcastGameStates();
  }

  @SubscribeMessage('player_input')
  onInput(
    @MessageBody() data: PlayerInputDto,
    @ConnectedSocket() client: Socket,
  ): void {
    if (!data?.roomName || !data?.input) return;
    this.gameService.handleInput(data.roomName, client.id, data.input);
  }
}
