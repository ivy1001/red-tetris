import { describe, expect, it } from 'vitest'
import reducer, { KEYS, MODES, reset, roomView, serverError, serverScores, serverState, validName } from '../../src/client/game'

const state = (over = {}) => ({
  room: 'r',
  status: 'waiting',
  host: 'alice',
  winner: null,
  mode: 'classic',
  me: 'alice',
  alive: true,
  score: 0,
  board: [],
  next: null,
  players: [
    { name: 'alice', alive: true, score: 0, spectrum: [] },
    { name: 'bob', alive: true, score: 0, spectrum: [] },
  ],
  ...over,
})

describe('game reducer', () => {
  it('stores server state, errors and scores; reset keeps the scores', () => {
    const s1 = reducer(undefined, serverError({ message: 'nope' }))
    expect(s1).toEqual({ server: null, error: 'nope', scores: [] })
    const s2 = reducer(s1, serverState(state()))
    expect(s2).toMatchObject({ server: state(), error: null })
    const s3 = reducer(s2, serverScores([{ name: 'a', score: 40 }]))
    expect(reducer(s3, reset())).toEqual({ server: null, error: null, scores: [{ name: 'a', score: 40 }] })
  })

  it('maps keys, names modes and validates names', () => {
    expect(KEYS[' ']).toBe('drop')
    expect(Object.keys(MODES)).toEqual(['classic', 'invisible', 'gravity'])
    expect(validName('ab_c-1')).toBe(true)
    expect(validName('')).toBe(false)
    expect(validName('a/b')).toBe(false)
  })
})

describe('roomView', () => {
  it('lists opponents and lets the host start', () => {
    const v = roomView(state())
    expect(v.opponents.map((p) => p.name)).toEqual(['bob'])
    expect(v.overlay).toMatchObject({ title: 'Room r', button: 'Start game' })
    expect(v.overlay.text).toMatch(/^2 players here/)
    expect(roomView(state({ players: [state().players[0]] })).overlay.text).toMatch(/^1 player here/)
  })

  it('tells guests to wait for the host', () => {
    const v = roomView(state({ me: 'bob' }))
    expect(v.overlay).toMatchObject({ text: 'Waiting for alice to start the game.', button: false })
  })

  it('shows nothing while playing and alive, game over when out', () => {
    expect(roomView(state({ status: 'playing' })).overlay).toBeNull()
    expect(roomView(state({ status: 'playing', alive: false })).overlay.title).toBe('Game over')
  })

  it('announces the winner and the score', () => {
    expect(roomView(state({ status: 'ended', winner: 'alice', score: 40 })).overlay).toMatchObject({
      title: 'You win',
      text: 'You scored 40.',
      button: 'Play again',
    })
    const guest = roomView(state({ status: 'ended', winner: 'alice', me: 'bob' })).overlay
    expect(guest.title).toBe('alice wins')
    expect(guest.text).toBe('You scored 0. Waiting for alice to start the next round.')
    expect(roomView(state({ status: 'ended' })).overlay.title).toBe('Game over')
  })
})
