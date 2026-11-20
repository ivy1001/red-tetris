import { serverError, serverScores, serverState } from '../game'

// All socket.io traffic goes through the Redux middleware below. Components never touch the socket:
// they dispatch emit(...) actions, and server events come back as ordinary Redux actions.

export const EMIT = 'socket/emit'
export const emit = (event, payload) => ({ type: EMIT, event, payload })

const SERVER_EVENTS = { state: serverState, game_error: serverError, scores: serverScores }

export const socketMiddleware = (socket) => (store) => {
  // The room we're in, re-joined after a reconnect (the server forgets us on disconnect).
  let joined = null

  Object.entries(SERVER_EVENTS).forEach(([event, action]) => socket.on(event, (data) => store.dispatch(action(data))))
  socket.on('connect', () => joined && socket.emit('join', joined))

  return (next) => (action) => {
    if (action.type !== EMIT) return next(action)
    if (action.event === 'join') {
      joined = action.payload
      // Not connected yet: the 'connect' handler sends it (emitting now too would join twice).
      if (socket.connected) socket.emit('join', joined)
      return undefined
    }
    if (action.event === 'leave') joined = null
    socket.emit(action.event, action.payload)
    return undefined
  }
}
