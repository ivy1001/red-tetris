import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  CurrentPieceDto,
  GameStatePayload,
  GameStatus,
  OpponentSummary,
} from '../types';

interface GameSliceState {
  status: GameStatus;
  isAlive: boolean;
  score: number;
  board: number[][];
  currentPiece: CurrentPieceDto | null;
  opponents: OpponentSummary[];
}

const emptyBoard = (): number[][] =>
  Array.from({ length: 20 }, () => new Array(10).fill(0));

const initialState: GameSliceState = {
  status: 'idle',
  isAlive: false,
  score: 0,
  board: emptyBoard(),
  currentPiece: null,
  opponents: [],
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setGameState: (state, action: PayloadAction<GameStatePayload>) => {
      state.status = action.payload.status;
      state.isAlive = action.payload.isAlive;
      state.score = action.payload.score;
      state.board = action.payload.board;
      state.currentPiece = action.payload.currentPiece;
      state.opponents = action.payload.opponents;
    },
    setStatus: (state, action: PayloadAction<GameStatus>) => {
      state.status = action.payload;
    },
    resetGame: () => ({
      ...initialState,
      board: emptyBoard(),
    }),
  },
});

export const { setGameState, setStatus, resetGame } = gameSlice.actions;
export const gameReducer = gameSlice.reducer;
