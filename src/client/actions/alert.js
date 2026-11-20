export const ALERT_POP = 'ALERT_POP'
export const MOVE_SHAPE = 'MOVE_SHAPE'
export const MOVE_LEFT = 'MOVE_LEFT'
export const MOVE_RIGHT = 'MOVE_RIGHT'
export const ROTATE_PIECE = 'ROTATE_PIECE'
export const HARD_DROP = 'HARD_DROP'
export const RESTART_GAME = 'RESTART_GAME'

export const alert = (message) => {
  return {
    type: ALERT_POP,
    message
  }
}

export const gamemoves = () => {
  return {
    type: MOVE_SHAPE
  }
}

export const moveLeft = () => {
  return {
    type: MOVE_LEFT
  }
}

export const moveRight = () => {
  return {
    type: MOVE_RIGHT
  }
}

export const rotatePiece = () => {
  return {
    type: ROTATE_PIECE
  }
}

export const hardDrop = () => ({
  type: HARD_DROP
})

export const restartGame = () => ({
  type: RESTART_GAME
})
