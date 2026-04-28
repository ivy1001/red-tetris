import { useEffect, type FC } from 'react';
import { useParams } from 'react-router-dom';
import {
  isConnected,
  joinRoom,
  offConnect,
  onConnect,
} from '../socket/api';
import { useSocket } from '../socket/useSocket';
import { useKeyboard } from '../hooks/useKeyboard';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setIdentity } from '../store/roomSlice';
import { Lobby } from '../components/Lobby';
import { Board } from '../components/Board';
import { Spectrum } from '../components/Spectrum';
import { GameOver } from '../components/GameOver';

const STATUS_LABELS: Record<string, string> = {
  idle: 'idle',
  waiting: 'waiting',
  playing: 'playing',
  ended: 'ended',
};

export const GamePage: FC = () => {
  const { room, playerName } = useParams<{
    room: string;
    playerName: string;
  }>();

  useSocket();

  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.game.status);
  const error = useAppSelector((s) => s.room.error);
  const opponents = useAppSelector((s) => s.game.opponents);
  const score = useAppSelector((s) => s.game.score);

  useEffect(() => {
    if (!room || !playerName) return;
    dispatch(setIdentity({ roomName: room, playerName }));
  }, [room, playerName, dispatch]);

  useEffect(() => {
    if (!room || !playerName) return;
    const join = () => joinRoom(room, playerName);
    if (isConnected()) join();
    onConnect(join);
    return () => {
      offConnect(join);
    };
  }, [room, playerName]);

  useKeyboard(room ?? null, status === 'playing');

  if (!room || !playerName) {
    return (
      <div className="page">
        <div className="error-card">URL must be /:room/:playerName</div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          <span className="brand-text">RED TETRIS</span>
        </div>
        <div className="meta-chips">
          <span className="chip">
            <span className="chip-key">room</span>
            <span className="chip-val">{room}</span>
          </span>
          <span className="chip">
            <span className="chip-key">you</span>
            <span className="chip-val">{playerName}</span>
          </span>
          {status === 'playing' && (
            <span className="chip score-chip">
              <span className="chip-key">score</span>
              <span className="chip-val score-num">
                {score.toLocaleString()}
              </span>
            </span>
          )}
          <span className={`chip status status-${status}`}>
            <span className="chip-key">status</span>
            <span className="chip-val">{STATUS_LABELS[status] ?? status}</span>
          </span>
        </div>
        {error && <div className="error-banner">{error}</div>}
      </header>

      {status === 'playing' && (
        <main className="play-area">
          <div className="play-stage">
            <section className="board-column">
              <Board />
            </section>
            <aside className="opponents-column">
              <h3 className="section-title">Opponents</h3>
              {opponents.length === 0 && (
                <div className="empty-card">
                  <span className="empty-glyph">∅</span>
                  <span>solo run</span>
                </div>
              )}
              <div className="opponents-list">
                {opponents.map((o) => (
                  <Spectrum key={o.id} opponent={o} />
                ))}
              </div>
            </aside>
          </div>
        </main>
      )}

      {status === 'ended' && (
        <main className="modal-area">
          <GameOver />
        </main>
      )}

      {(status === 'idle' || status === 'waiting') && (
        <main className="modal-area">
          <Lobby />
        </main>
      )}

      {status === 'playing' && (
        <footer className="controls-hint">
          <span className="hint-group">
            <kbd>←</kbd><kbd>→</kbd>
            <span>move</span>
          </span>
          <span className="hint-group">
            <kbd>↑</kbd>
            <span>rotate</span>
          </span>
          <span className="hint-group">
            <kbd>↓</kbd>
            <span>soft drop</span>
          </span>
          <span className="hint-group">
            <kbd>space</kbd>
            <span>hard drop</span>
          </span>
        </footer>
      )}
    </div>
  );
};
