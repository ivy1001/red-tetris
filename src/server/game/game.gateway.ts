import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsResponse,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ScoreBoard } from '../scores';
import { Game, GameError, Input, MODES, Mode } from './game';

const INPUTS: Input[] = ['left', 'right', 'rotate', 'down', 'drop'];
const validName = (s: unknown): s is string => typeof s === 'string' && /^[\w-]{1,20}$/.test(s);
const fail = (message: string): WsResponse<{ message: string }> => ({ event: 'game_error', data: { message } });

@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway implements OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  readonly games = new Map<string, Game>();

  constructor(private readonly scores: ScoreBoard) {}

  @SubscribeMessage('join')
  join(@ConnectedSocket() socket: Socket, @MessageBody() body: { room?: unknown; name?: unknown }) {
    const { room, name } = body ?? {};
    if (!validName(room) || !validName(name)) return fail('Room and name must be 1-20 letters, digits, _ or -');
    if (socket.data.room) return fail('Already in a room');
    const game = this.games.get(room) ?? new Game(
      room,
      (g) => this.broadcast(g),
      (g) => this.recordScores(g),
    );
    try {
      game.addPlayer(socket.id, name);
    } catch (e) {
      return fail((e as Error).message);
    }
    this.games.set(room, game);
    socket.data.room = room;
  }

  @SubscribeMessage('start')
  start(@ConnectedSocket() socket: Socket, @MessageBody() mode?: Mode) {
    const game = this.games.get(socket.data.room);
    if (!game) return fail('Join a room first');
    try {
      game.start(socket.id, typeof mode === 'string' && Object.hasOwn(MODES, mode) ? mode : 'classic');
    } catch (e) {
      if (e instanceof GameError) return fail(e.message);
      throw e;
    }
  }

  @SubscribeMessage('input')
  input(@ConnectedSocket() socket: Socket, @MessageBody() input: Input) {
    if (INPUTS.includes(input)) this.games.get(socket.data.room)?.handleInput(socket.id, input);
  }

  @SubscribeMessage('leave')
  handleDisconnect(@ConnectedSocket() socket: Socket) {
    const game = this.games.get(socket.data.room);
    socket.data.room = undefined;
    if (!game) return;
    game.removePlayer(socket.id);
    if (game.players.length === 0) this.games.delete(game.room);
  }

  @SubscribeMessage('scores')
  topScores() {
    return { event: 'scores', data: this.scores.top() };
  }

  private recordScores(game: Game): void {
    const date = new Date().toISOString().slice(0, 10);
    this.scores.record(game.players.map((p) => ({ name: p.name, score: p.score, mode: game.mode, date })));
  }

  private broadcast(game: Game): void {
    game.players.forEach((p) => this.server.to(p.id).emit('state', game.stateFor(p.id)));
  }
}
