// Outbound side of the socket layer. Components and pages MUST go through
// these wrappers — they should never import the raw socket. This keeps
// socket.io fully encapsulated in src/socket/.
import { socket } from './socket';
import type { PlayerInput } from '../types';

export const joinRoom = (roomName: string, playerName: string): void => {
  socket.emit('join_room', { roomName, playerName });
};

export const startGame = (roomName: string): void => {
  socket.emit('start_game', { roomName });
};

export const restartGame = (roomName: string): void => {
  socket.emit('restart_game', { roomName });
};

export const sendInput = (roomName: string, input: PlayerInput): void => {
  socket.emit('player_input', { roomName, input });
};

export const onConnect = (handler: () => void): void => {
  socket.on('connect', handler);
};

export const offConnect = (handler: () => void): void => {
  socket.off('connect', handler);
};

export const isConnected = (): boolean => socket.connected;
