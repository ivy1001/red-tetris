
import React from 'react'
import store from '../store'
import {
  gamemoves,
  moveLeft,
  moveRight,
  rotatePiece,
  hardDrop
} from '../actions/alert'

class Movements extends React.Component {

  componentDidMount() {
    window.addEventListener('keydown', this.handleKeyDown)
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.handleKeyDown)
  }

  handleKeyDown = (event) => {

  if (store.getState().game.gameOver) {
      return
    } 
  
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        store.dispatch(moveLeft())
        break

      case 'ArrowRight':
        event.preventDefault()
        store.dispatch(moveRight())
        break

      case 'ArrowDown':
        event.preventDefault()
        store.dispatch(gamemoves())
        break
      
      case 'ArrowUp':
          event.preventDefault()
          store.dispatch(rotatePiece())
          break
      
      case ' ':
          event.preventDefault()
          store.dispatch(hardDrop())
          break

      default:
        break
    }
  }

  render() {
    return null
  }
}

export default Movements
