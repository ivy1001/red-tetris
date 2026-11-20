import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { MODES, validName } from '../game'
import { socket } from '../socket'
import Controls from './Controls'
import Logo from './Logo'

const Field = ({ id, label, hint, value, onChange }) => {
  const invalid = value !== '' && !validName(value)
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={value}
        maxLength={20}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={invalid}
        aria-describedby={`${id}-hint`}
        onChange={(e) => onChange(e.target.value.trim())}
      />
      <small id={`${id}-hint`} className={invalid ? 'invalid' : ''}>
        {invalid ? 'Use up to 20 letters, digits, _ or -.' : hint}
      </small>
    </div>
  )
}

const LandingPage = () => {
  const navigate = useNavigate()
  const scores = useSelector((s) => s.game.scores)
  const [name, setName] = useState('')
  const [room, setRoom] = useState('')

  useEffect(() => {
    socket.emit('scores')
  }, [])

  const playSolo = () => navigate(`/solo-${Math.random().toString(36).slice(2, 8)}/${name}`)
  const joinRoom = (e) => {
    e.preventDefault()
    navigate(`/${room}/${name}`)
  }

  return (
    <main className="landing">
      <header className="landing-hero">
        <Logo />
        <p className="tagline">
          Same pieces for everyone. Clear lines to bury your rivals. Last one standing wins.
        </p>
      </header>

      <form className="panel landing-form" onSubmit={joinRoom}>
        <Field id="name" label="Your name" hint="Shown to the other players." value={name} onChange={setName} />
        <Field id="room" label="Room" hint="Friends join with the same room name." value={room} onChange={setRoom} />
        <div className="actions">
          <button type="submit" className="btn btn-primary" disabled={!validName(name) || !validName(room)}>
            Join room
          </button>
          <button type="button" className="btn" disabled={!validName(name)} onClick={playSolo}>
            Play solo
          </button>
        </div>
      </form>

      <section className="panel landing-scores" aria-labelledby="best-title">
        <h2 id="best-title">Best scores</h2>
        {scores.length ? (
          <ol className="scores">
            {scores.map((s, i) => (
              <li key={i}>
                <span className="scores-name">{s.name}</span>
                <span className="scores-mode">{MODES[s.mode]?.label ?? s.mode}</span>
                <span className="scores-points">{s.score}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty">No scores yet. Clear some lines to get on the board.</p>
        )}
      </section>

      <section className="landing-controls" aria-label="Controls">
        <Controls />
      </section>
    </main>
  )
}

export default LandingPage
