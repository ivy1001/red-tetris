// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import game from '../../src/client/game'
import { socketMiddleware } from '../../src/client/middleware/socket'
import App from '../../src/client/App'

// A fake socket: records emits, and lets a test fire server events through the real middleware.
const fakeSocket = (connected) => {
  const handlers = {}
  return { connected, handlers, emit: vi.fn(), on: vi.fn((event, fn) => (handlers[event] = fn)) }
}

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

let socket
const renderAt = (path, connected = true) => {
  socket = fakeSocket(connected)
  const store = configureStore({ reducer: { game }, middleware: (getDefault) => getDefault().concat(socketMiddleware(socket)) })
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </Provider>
  )
}
const server = (event, data) => act(() => socket.handlers[event](data))
const emitted = (event) => socket.emit.mock.calls.filter(([e]) => e === event)
const type = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } })

afterEach(cleanup)

describe('LandingPage', () => {
  it('asks for the best scores and lists them', () => {
    renderAt('/')
    expect(socket.emit).toHaveBeenCalledWith('scores', undefined)
    expect(screen.getByText(/No scores yet/)).toBeTruthy()
    server('scores', [
      { name: 'ana', score: 1200, mode: 'gravity', date: 'd' },
      { name: 'x', score: 1, mode: 'odd', date: 'd' },
    ])
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

  it('accepts the hash URL form /#room[player]', () => {
    renderAt('/#r[alice]')
    expect(socket.emit).toHaveBeenCalledWith('join', { room: 'r', name: 'alice' })
  })

  it('redirects unknown routes home', () => {
    renderAt('/a/b/c')
    expect(screen.getByText('Play solo')).toBeTruthy()
  })
})

describe('Room', () => {
  it('joins once connected, re-joins after a reconnect, and stops after leaving', () => {
    const { unmount } = renderAt('/r/alice', false)
    expect(emitted('join')).toEqual([])
    expect(screen.getByText('Connecting')).toBeTruthy()
    socket.handlers.connect()
    socket.handlers.connect()
    expect(emitted('join')).toEqual([
      ['join', { room: 'r', name: 'alice' }],
      ['join', { room: 'r', name: 'alice' }],
    ])
    unmount()
    expect(socket.emit).toHaveBeenCalledWith('leave', undefined)
    socket.handlers.connect()
    expect(emitted('join')).toHaveLength(2)
  })

  it('shows join errors', () => {
    renderAt('/r/alice')
    server('game_error', { message: 'Name "alice" is taken in this room' })
    expect(screen.getByText("Can't join the room")).toBeTruthy()
    expect(screen.getByText(/is taken/)).toBeTruthy()
  })

  it('lets the host pick a mode and start', () => {
    renderAt('/r/alice')
    server('state', serverStateFor())
    expect(screen.getByText('Classic', { selector: 'button' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByText('High gravity'))
    fireEvent.click(screen.getByText('Start game'))
    expect(socket.emit).toHaveBeenCalledWith('start', 'gravity')
  })

  it('renders board, next piece, score and opponents, and sends keys', () => {
    const { container } = renderAt('/r/alice')
    server('state', serverStateFor({ status: 'playing', score: 340, next: [['purple', 'purple', 'purple']] }))
    expect(container.querySelectorAll('.board .cell')).toHaveLength(200)
    expect(container.querySelectorAll('.preview .cell.purple')).toHaveLength(3)
    expect(screen.getByText('340')).toBeTruthy()
    expect(screen.getByText('bob')).toBeTruthy()
    expect(screen.getByText('Out')).toBeTruthy()
    expect(container.querySelectorAll('.spectrum .on')).toHaveLength(20)
    expect(screen.queryByText('Start game')).toBeNull()

    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    fireEvent.keyDown(window, { key: 'a' })
    expect(emitted('input')).toEqual([['input', 'left']])

    server('game_error', { message: 'Only the host can start the game' })
    expect(screen.getByRole('alert').textContent).toBe('Only the host can start the game')
  })

  it('ignores keys pressed on a focused button and shows the solo hint', () => {
    const { container } = renderAt('/r/alice')
    server('state', serverStateFor({ players: [serverStateFor().players[0]] }))
    expect(screen.getByText(/Nobody else here/)).toBeTruthy()
    expect(container.querySelector('.preview-empty')).toBeTruthy()
    fireEvent.keyDown(screen.getByText('Start game'), { key: ' ' })
    expect(emitted('input')).toEqual([])
  })
})
