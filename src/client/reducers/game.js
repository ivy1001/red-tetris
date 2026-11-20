
import {
  hasCollision,
  getrandompiece,
  createEmptyBoard,
  placePiece,
  rotateMatrix,
  isGameOver,
  clearLines
} from '../components/Tetris'

import {
  MOVE_SHAPE,
  MOVE_LEFT,
  MOVE_RIGHT,
  ROTATE_PIECE,
  HARD_DROP,
  RESTART_GAME
} from '../actions/alert'

const position = {
  row: 0,
  col: 3
}

const initialState = {
  board: createEmptyBoard(),
  piece: getrandompiece(),
  position,
  gameOver: false
}

const game = (state = initialState, action) => {

  const nextPosition = {
    row: state.position.row + 1,
    col: state.position.col
  }

  if (action.type === RESTART_GAME) {
    return {
      board: createEmptyBoard(),
      piece: getrandompiece(),
      position: { row: 0, col: 3 },
      gameOver: false
    }
  }

  if (state.gameOver) {
    return state
  }

  switch (action.type) {

    case HARD_DROP: {
      let finalPosition = state.position

      while (!hasCollision(
        state.board,
        state.piece,
        { ...finalPosition, row: finalPosition.row + 1 }
      )) {
        finalPosition = {
          ...finalPosition,
          row: finalPosition.row + 1
        }
      }


      const lockedBoard = placePiece(
        state.board,
        state.piece,
        finalPosition
      )

  
      const { board: updatedBoard, clearedLines } = clearLines(lockedBoard)

      const newPiece = getrandompiece()
      const newPosition = { row: 0, col: 3 }

      return {
        ...state,
        board: updatedBoard,
        piece: newPiece,
        position: newPosition,
        gameOver: isGameOver(updatedBoard, newPiece, newPosition)
      }
    }

    case ROTATE_PIECE: {
      const rotatedPiece = rotateMatrix(state.piece)

      if (hasCollision(state.board, rotatedPiece, state.position)) {
        return state
      }

      return {
        ...state,
        piece: rotatedPiece
      }
    }

    case MOVE_SHAPE:

      if (hasCollision(state.board, state.piece, nextPosition)) {

        const lockedBoard = placePiece(
          state.board,
          state.piece,
          state.position
        )


        const { board: updatedBoard, clearedLines } = clearLines(lockedBoard)

        const newPiece = getrandompiece()
        const newPosition = { row: 0, col: 3 }

        return {
          ...state,
          board: updatedBoard,
          piece: newPiece,
          position: newPosition,
          gameOver: isGameOver(updatedBoard, newPiece, newPosition)
        }
      }

      return {
        ...state,
        position: nextPosition
      }

    case MOVE_RIGHT: {
      const nextPosition = {
        ...state.position,
        col: state.position.col + 1
      }

      if (hasCollision(state.board, state.piece, nextPosition)) {
        return state
      }

      return {
        ...state,
        position: nextPosition
      }
    }

    case MOVE_LEFT: {
      const nextPosition = {
        ...state.position,
        col: state.position.col - 1
      }

      if (hasCollision(state.board, state.piece, nextPosition)) {
        return state
      }

      return {
        ...state,
        position: nextPosition
      }
    }

    default:
      return state
  }
}

export default game
