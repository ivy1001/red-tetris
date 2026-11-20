import React from 'react'

const LandingPage = ({ onPlaySolo, onPlayMultiplayer }) => {
  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="landing-logo">
          <span className="logo-block">R</span>
          RED TETRIS
        </div>

        <div className="landing-nav-links">
          <a href="#about">ABOUT</a>
          <a href="#controls">CONTROLS</a>
        </div>
      </nav>

      <main className="landing-main">
        <div className="landing-tag">
          <span className="landing-dot"></span>
          TETRIS NETWORK
        </div>

        <h1 className="landing-title">
          STACK
          <br />
          <span>THE</span> RED.
        </h1>

        <p className="landing-description">
          The classic game.
          <br />
          A new competition.
          <br />
          How long can you survive?
        </p>

        <div className="landing-actions">
          <button
            className="landing-btn landing-btn-primary"
            onClick={onPlaySolo}
          >
            <span>▶</span> PLAY SOLO
          </button>

          <button
            className="landing-btn landing-btn-secondary"
            onClick={onPlayMultiplayer}
          >
            MULTIPLAYER <span>↗</span>
          </button>
        </div>

        <div className="landing-info">
          <span>10 × 20 GRID</span>
          <span className="info-separator">/</span>
          <span>7 TETRIMINOS</span>
          <span className="info-separator">/</span>
          <span>RED PELICANS</span>
        </div>
      </main>

      <div className="landing-decoration">
        <div className="block block-i">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>

        <div className="block block-t">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>

        <div className="block block-l">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>

        <div className="block block-z">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      <footer className="landing-footer">
        <span>RED PELICANS</span>
        <span>FULL STACK JAVASCRIPT PROJECT</span>
      </footer>
    </div>
  )
}

export default LandingPage