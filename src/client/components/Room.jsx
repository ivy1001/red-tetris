import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useParams } from 'react-router-dom'
import { KEYS, MODES, reset, roomView } from '../game'
import { emit } from '../middleware/socket'
import Cell from './Cell'
import Controls from './Controls'
import Logo from './Logo'

const Grid = ({ rows, className }) => (
  <div className={className}>
    {rows.map((row, r) => (
      <div className="row" key={r}>
        {row.map((value, c) => <Cell key={c} value={value} />)}
      </div>
    ))}
  </div>
)

const Opponent = ({ player }) => (
  <li className={`opponent ${player.alive ? '' : 'out'}`}>
    <div className="opponent-head">
      <span className="opponent-name">{player.name}</span>
      <span className="opponent-score">{player.alive ? player.score : 'Out'}</span>
    </div>
    <div className="spectrum" aria-label={`${player.name}'s column heights: ${player.spectrum.join(', ')}`}>
      {Array.from({ length: 20 }, (_, r) =>
        player.spectrum.map((h, c) => <span key={`${r}-${c}`} className={20 - r <= h ? 'on' : ''} />)
      )}
    </div>
  </li>
)

const ModePicker = ({ value, onChange }) => (
  <div className="modes" role="group" aria-label="Game mode">
    {Object.entries(MODES).map(([key, { label, hint }]) => (
      <button key={key} type="button" className="mode" aria-pressed={value === key} title={hint} onClick={() => onChange(key)}>
        {label}
      </button>
    ))}
  </div>
)

const Message = ({ title, children }) => (
  <main className="message">
    <Logo size="small" />
    <h1>{title}</h1>
    {children}
    <Link className="btn" to="/">Back to the lobby</Link>
  </main>
)

const Room = () => {
  const { room, name } = useParams()
  const dispatch = useDispatch()
  const { server, error } = useSelector((s) => s.game)
  const [mode, setMode] = useState(null)

  // Join on mount (the socket middleware re-joins after a reconnect); leave on unmount.
  useEffect(() => {
    dispatch(emit('join', { room, name }))
    return () => {
      dispatch(emit('leave'))
      dispatch(reset())
    }
  }, [room, name, dispatch])

  useEffect(() => {
    const onKey = (e) => {
      const input = KEYS[e.key]
      if (!input || e.target.tagName === 'BUTTON') return
      e.preventDefault()
      dispatch(emit('input', input))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch])

  if (!server)
    return error ? (
      <Message title="Can't join the room">
        <p>{error}</p>
      </Message>
    ) : (
      <Message title="Connecting" />
    )

  const { opponents, overlay } = roomView(server)
  const picked = mode ?? server.mode

  return (
    <div className="room">
      <header className="room-bar">
        <Link to="/" aria-label="Back to the lobby">
          <Logo size="small" />
        </Link>
        <h1>Room {server.room}</h1>
        <Link className="leave" to="/">Leave room</Link>
      </header>

      <main className="room-layout">
        <aside className="panel rail">
          <section>
            <h2>Next</h2>
            {server.next ? <Grid className="preview" rows={server.next} /> : <div className="preview-empty" />}
          </section>
          <section>
            <h2>Score</h2>
            <p className="score">{server.score}</p>
          </section>
          <section>
            <h2>Mode</h2>
            <p>{MODES[server.mode]?.label}</p>
          </section>
          <Controls />
        </aside>

        <div className="board-wrap">
          <Grid className="board" rows={server.board} />
          {overlay && (
            <div className="overlay" role="status">
              <h2>{overlay.title}</h2>
              <p>{overlay.text}</p>
              {overlay.button && (
                <>
                  <ModePicker value={picked} onChange={setMode} />
                  <button className="btn btn-primary" onClick={() => dispatch(emit('start', picked))}>
                    {overlay.button}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <aside className="panel rail rail-opponents">
          <h2>Opponents</h2>
          {opponents.length ? (
            <ul className="opponents">
              {opponents.map((p) => <Opponent key={p.name} player={p} />)}
            </ul>
          ) : (
            <p className="empty">Nobody else here. Share the page link to play together.</p>
          )}
        </aside>
      </main>

      {error && <p className="room-error" role="alert">{error}</p>}
    </div>
  )
}

export default Room
