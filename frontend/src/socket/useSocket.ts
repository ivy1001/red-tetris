import { useEffect } from 'react';
import { socket } from './socket';
import { useAppDispatch } from '../store/hooks';
import {
  setError,
  setHostChanged,
  setRoomState,
} from '../store/roomSlice';
import { resetGame, setGameState, setStatus } from '../store/gameSlice';
import type {
  ErrorPayload,
  GameOverPayload,
  GameStatePayload,
  HostChangedPayload,
  RoomStatePayload,
} from '../types';

// Wires socket.io listeners → Redux. Connects on mount, disconnects on unmount.
export const useSocket = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const onRoomState = (data: RoomStatePayload) => {
      dispatch(setRoomState(data));
    };
    const onGameState = (data: GameStatePayload) => {
      dispatch(setGameState(data));
    };
    const onGameStarted = () => {
      dispatch(setStatus('playing'));
    };
    const onGameOver = (data: GameOverPayload) => {
      dispatch(setStatus('ended'));
      // winner arrives via the room_state that follows endGame; no-op here
      void data;
    };
    const onHostChanged = (data: HostChangedPayload) => {
      dispatch(setHostChanged(data));
    };
    const onErrorEvent = (data: ErrorPayload) => {
      dispatch(setError(data?.message ?? 'Unknown error'));
    };
    const onConnectError = (err: Error) => {
      dispatch(setError(`Cannot reach server: ${err.message}`));
    };
    const onDisconnect = () => {
      dispatch(resetGame());
    };

    socket.on('room_state', onRoomState);
    socket.on('game_state', onGameState);
    socket.on('game_started', onGameStarted);
    socket.on('game_over', onGameOver);
    socket.on('host_changed', onHostChanged);
    socket.on('error_event', onErrorEvent);
    socket.on('connect_error', onConnectError);
    socket.on('disconnect', onDisconnect);

    if (!socket.connected) socket.connect();

    return () => {
      socket.off('room_state', onRoomState);
      socket.off('game_state', onGameState);
      socket.off('game_started', onGameStarted);
      socket.off('game_over', onGameOver);
      socket.off('host_changed', onHostChanged);
      socket.off('error_event', onErrorEvent);
      socket.off('connect_error', onConnectError);
      socket.off('disconnect', onDisconnect);
      socket.disconnect();
    };
  }, [dispatch]);
};
