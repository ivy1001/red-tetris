import React from 'react'
import { connect } from 'react-redux'
import Cell from './Cell'
import PIECES from './Piece'
import '../style.css'
import {gamemoves} from '../actions/alert'
import Movements from './Movements'
import store from '../store'
import { restartGame } from '../actions/alert'
import { div } from 'react/lib/ReactDOMFactories'

const ROWS = 20
const COLS = 10

export const createEmptyBoard = () => 
  {
  return Array.from({ length: ROWS }, () =>
    Array(COLS).fill('empty')
  )
}

export const Tetris = () => 
  {
    return (
      <div className="game-container">
        <h1>TETRIS</h1>
        <Movements/>
        <ConnectedBoard/>
      </div>
    )
  }

export const placePiece = (board, piece, position) => {
  const newBoard = board.map(row => [...row])

  piece.forEach((pieceRow, rowIndex) => {
    pieceRow.forEach((cell, colIndex) => {
      if (cell !== 'empty') {
        const boardRow = position.row + rowIndex
        const boardCol = position.col + colIndex

        newBoard[boardRow][boardCol] = cell
      }
    })
  })

  return newBoard
}

const mapStateToProps = (state) => {
  return {
    game: state.game
  }
}

let dropTimer = null

const stopDropping = () => {
  if (dropTimer !== null) {
    clearInterval(dropTimer)
    dropTimer = null
  }
}

const startDropping = (dispatch) => {
  stopDropping()

  dropTimer = setInterval(() => {
    const state = store.getState()

    if (!state.game.gameOver) {
      dispatch(gamemoves())
    } else {
      stopDropping()
    }
  }, 500)
}


export const getrandompiece = () => 
{
  const pieces = Object.values(PIECES)
  const randomIndex = Math.floor(Math.random() * pieces.length)
  return pieces[randomIndex].shape
}

export const hasCollision = (board, shape, position) => {
  return shape.some((row, rowIndex) =>
    row.some((cell, colIndex) => {
      if (cell === 'empty') return false

      const boardRow = position.row + rowIndex
      const boardCol = position.col + colIndex

      return (
        boardRow >= ROWS ||
        boardCol < 0 ||
        boardCol >= COLS ||
        board[boardRow][boardCol] !== 'empty'
      )
    })
  )
}

export const isGameOver = (board, piece, position) => {
  return hasCollision(board, piece, position)
}


export const clearLines = (board) => {
  const remainingRows = board.filter(row =>
    row.some(cell => cell === 'empty')
  )

  const clearedLines = 20 - remainingRows.length

  const emptyRows = Array.from(
    { length: clearedLines },
    () => Array(10).fill('empty')
  )

  return {
    board: [...emptyRows, ...remainingRows],
    clearedLines
  }
}


export const rotateMatrix = (piece) => {
  return piece[0].map((_, colIndex) =>
    piece.map(row => row[colIndex]).reverse()
  )
}

class Board extends React.Component {
  componentDidMount() {
    startDropping(store.dispatch)
  }

  componentWillUnmount() {
    stopDropping()
  }

  render() {
    const game = this.props.game
    const board = game.board
    const piece = game.piece

    const handleRestart = () => {
      store.dispatch(restartGame())
      startDropping(store.dispatch)
    }

    return (
      <div className="board">

        {game.gameOver && (
          <div className="game-over">
            <h2>GAME OVER</h2>
            <button onClick={handleRestart}>
              Restart
            </button>
          </div>
        )}

        {board.map((row, rowIndex) => (
          <div className="row" key={rowIndex}>
            {row.map((value, colIndex) => {
              const pieceRow = rowIndex - game.position.row
              const pieceCol = colIndex - game.position.col

              const isInsidePiece =
                pieceRow >= 0 &&
                pieceRow < piece.length &&
                pieceCol >= 0 &&
                pieceCol < piece[pieceRow].length

              const pieceValue = isInsidePiece
                ? piece[pieceRow][pieceCol]
                : 'empty'

              const cellValue =
                isInsidePiece && pieceValue !== 'empty'
                  ? pieceValue
                  : value

              return (
                <Cell
                  key={`${rowIndex}-${colIndex}`}
                  value={cellValue}
                />
              )
            })}
          </div>
        ))}
      </div>
    )
  }
}

const ConnectedBoard = connect(mapStateToProps, null)(Board)

export default ConnectedBoard


