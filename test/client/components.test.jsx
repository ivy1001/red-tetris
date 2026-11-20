// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import game, { serverError, serverScores, serverState } from '../../src/client/game'
import App from '../../src/client/App'

const socket = vi.hoisted(() => ({ connected: true, emit: vi.fn(), on: vi.fn(), off: vi.fn() }))
vi.mock('../../src/client/socket', () => ({ socket }))

const emptyBoard = Array.from({ length: 20 }, () => Array(10).fill('empty'))
const serverStateFor = (over = {}) => ({
  room: 'r',
  status: 'waiting',
  host: 'alice',
  winner: null,
  mode: 'classic',
  me: 'alice',
  alive: true,
  score: 0,
  board: emptyBoard,
  next: null,
  players: [
    { name: 'alice', alive: true, score: 0, spectrum: Array(10).fill(0) },
    { name: 'bob', alive: true, score: 120, spectrum: [20, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { name: 'cara', alive: false, score: 40, spectrum: Array(10).fill(0) },
  ],
  ...over,
})

let store
const renderAt = (path) => {
  store = configureStore({ reducer: { game } })
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </Provider>
  )
}
const type = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } })

beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

describe('LandingPage', () => {
  it('asks for the best scores and lists them', () => {
    renderAt('/')
    expect(socket.emit).toHaveBeenCalledWith('scores')
    expect(screen.getByText(/No scores yet/)).toBeTruthy()
    act(() => store.dispatch(serverScores([{ name: 'ana', score: 1200, mode: 'gravity', date: 'd' }, { name: 'x', score: 1, mode: 'odd', date: 'd' }])))
    expect(screen.getByText('ana')).toBeTruthy()
    expect(screen.getByText('High gravity')).toBeTruthy()
    expect(screen.getByText('odd')).toBeTruthy()
  })

  it('validates names and joins a room', () => {
    renderAt('/')
    const join = screen.getByText('Join room')
    expect(screen.getByText('Play solo').disabled).toBe(true)
    type('Your name', 'a/b')
    expect(screen.getByText(/Use up to 20 letters/)).toBeTruthy()
    type('Your name', 'alice')
    expect(screen.getByText('Play solo').disabled).toBe(false)
    expect(join.disabled).toBe(true)
    type('Room', 'r')
    fireEvent.click(join)
    expect(socket.emit).toHaveBeenCalledWith('join', { room: 'r', name: 'alice' })
  })

  it('starts a solo game in a random room', () => {
    renderAt('/')
    type('Your name', 'alice')
    fireEvent.click(screen.getByText('Play solo'))
    expect(socket.emit).toHaveBeenCalledWith('join', { room: expect.stringMatching(/^solo-/), name: 'alice' })
  })

  it('redirects unknown routes home', () => {
    renderAt('/a/b/c')
    expect(screen.getByText('Play solo')).toBeTruthy()
  })
})

describe('Room', () => {
  it('waits for the connection before joining, and re-joins on reconnect', () => {
    socket.connected = false
    renderAt('/r/alice')
    expect(socket.emit).not.toHaveBeenCalled()
    expect(screen.getByText('Connecting')).toBeTruthy()
    const [event, join] = socket.on.mock.calls[0]
    expect(event).toBe('connect')
    join()
    expect(socket.emit).toHaveBeenCalledWith('join', { room: 'r', name: 'alice' })
    socket.connected = true
  })

  it('shows join errors', () => {
    renderAt('/r/alice')
    act(() => store.dispatch(serverError({ message: 'Name "alice" is taken in this room' })))
    expect(screen.getByText("Can't join the room")).toBeTruthy()
    expect(screen.getByText(/is taken/)).toBeTruthy()
  })

  it('lets the host pick a mode and start', () => {
    renderAt('/r/alice')
    act(() => store.dispatch(serverState(serverStateFor())))
    expect(screen.getByText('Classic', { selector: 'button' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByText('High gravity'))
    fireEvent.click(screen.getByText('Start game'))
    expect(socket.emit).toHaveBeenCalledWith('start', 'gravity')
  })

  it('renders board, next piece, score and opponents; sends keys; leaves on unmount', () => {
    const { container, unmount } = renderAt('/r/alice')
    act(() =>
      store.dispatch(serverState(serverStateFor({ status: 'playing', score: 340, next: [['purple', 'purple', 'purple']] })))
    )
    expect(container.querySelectorAll('.board .cell')).toHaveLength(200)
    expect(container.querySelectorAll('.preview .cell.purple')).toHaveLength(3)
    expect(screen.getByText('340')).toBeTruthy()
    expect(screen.getByText('bob')).toBeTruthy()
    expect(screen.getByText('Out')).toBeTruthy()
    expect(container.querySelectorAll('.spectrum .on')).toHaveLength(20)
    expect(screen.queryByText('Start game')).toBeNull()

    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    fireEvent.keyDown(window, { key: 'a' })
    expect(socket.emit.mock.calls.filter(([e]) => e === 'input')).toEqual([['input', 'left']])

    act(() => store.dispatch(serverError({ message: 'Only the host can start the game' })))
    expect(screen.getByRole('alert').textContent).toBe('Only the host can start the game')

    unmount()
    expect(socket.emit).toHaveBeenCalledWith('leave')
    expect(socket.off).toHaveBeenCalledWith('connect', expect.any(Function))
  })

  it('ignores keys pressed on a focused button and shows the solo hint', () => {
    const { container } = renderAt('/r/alice')
    act(() => store.dispatch(serverState(serverStateFor({ players: [serverStateFor().players[0]] }))))
    expect(screen.getByText(/Nobody else here/)).toBeTruthy()
    expect(container.querySelector('.preview-empty')).toBeTruthy()
    fireEvent.keyDown(screen.getByText('Start game'), { key: ' ' })
    expect(socket.emit.mock.calls.filter(([e]) => e === 'input')).toEqual([])
  })
})
