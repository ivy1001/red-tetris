import { createSlice } from '@reduxjs/toolkit'

// The server owns the game; the client only stores what it sent and maps keys to inputs.

const initialState = { server: null, error: null, scores: [] }

const game = createSlice({
  name: 'game',
  initialState,
  reducers: {
    serverState: (state, { payload }) => ({ ...state, server: payload, error: null }),
    serverError: (state, { payload }) => ({ ...state, error: payload.message }),
    serverScores: (state, { payload }) => ({ ...state, scores: payload }),
    reset: (state) => ({ ...initialState, scores: state.scores }),
  },
})

export const { serverState, serverError, serverScores, reset } = game.actions
export default game.reducer

export const KEYS = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'rotate',
  ArrowDown: 'down',
  ' ': 'drop',
}

export const MODES = {
  classic: { label: 'Classic', hint: 'The original rules.' },
  invisible: { label: 'Invisible', hint: 'Pieces vanish once they land.' },
  gravity: { label: 'High gravity', hint: 'Pieces fall three times faster.' },
}

// Same rule the server enforces for room and player names.
export const validName = (s) => /^[\w-]{1,20}$/.test(s)

// Old-style hash URL `/#room[player]` -> `/room/player` (null if it isn't one).
export const hashRoute = (hash) => {
  try {
    const m = /^#([\w-]{1,20})\[([\w-]{1,20})\]$/.exec(decodeURIComponent(hash))
    return m ? `/${m[1]}/${m[2]}` : null
  } catch {
    return null // malformed %-escape
  }
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

// What the room screen shows, derived from the server state.
export const roomView = (s) => {
  const isHost = s.host === s.me
  const opponents = s.players.filter((p) => p.name !== s.me)
  const wait = `Waiting for ${s.host} to start ${s.status === 'ended' ? 'the next round' : 'the game'}.`
  const overlay =
    s.status === 'waiting'
      ? {
          title: `Room ${s.room}`,
          text: isHost ? `${plural(s.players.length, 'player')} here. Invite others with the page link.` : wait,
          button: isHost && 'Start game',
        }
      : s.status === 'ended'
        ? {
            title: !s.winner ? 'Game over' : s.winner === s.me ? 'You win' : `${s.winner} wins`,
            text: `You scored ${s.score}.${isHost ? '' : ` ${wait}`}`,
            button: isHost && 'Play again',
          }
        : !s.alive
          ? { title: 'Game over', text: 'Watch the others finish the round.' }
          : null
  return { isHost, opponents, overlay }
}
