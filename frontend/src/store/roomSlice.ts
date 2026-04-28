import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  HostChangedPayload,
  PlayerSummary,
  RoomStatePayload,
} from '../types';

interface RoomSliceState {
  roomName: string | null;
  playerName: string | null;
  players: PlayerSummary[];
  hostId: string | null;
  winner: string | null;
  error: string | null;
}

const initialState: RoomSliceState = {
  roomName: null,
  playerName: null,
  players: [],
  hostId: null,
  winner: null,
  error: null,
};

const roomSlice = createSlice({
  name: 'room',
  initialState,
  reducers: {
    setIdentity: (
      state,
      action: PayloadAction<{ roomName: string; playerName: string }>,
    ) => {
      state.roomName = action.payload.roomName;
      state.playerName = action.payload.playerName;
      state.error = null;
    },
    setRoomState: (state, action: PayloadAction<RoomStatePayload>) => {
      state.players = action.payload.players;
      state.hostId = action.payload.hostId;
      state.winner = action.payload.winner;
      // roomName is authoritative from URL, but mirror server's view
      state.roomName = action.payload.roomName;
    },
    setHostChanged: (
      state,
      action: PayloadAction<HostChangedPayload>,
    ) => {
      state.hostId = action.payload.newHostId;
      state.players = state.players.map((p) => ({
        ...p,
        isHost: p.id === action.payload.newHostId,
      }));
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetRoom: () => initialState,
  },
});

export const {
  setIdentity,
  setRoomState,
  setHostChanged,
  setError,
  clearError,
  resetRoom,
} = roomSlice.actions;

export const roomReducer = roomSlice.reducer;
