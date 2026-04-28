import type { FC } from 'react';
import { startGame } from '../socket/api';
import { useAppSelector } from '../store/hooks';

export const Lobby: FC = () => {
  const roomName = useAppSelector((s) => s.room.roomName);
  const playerName = useAppSelector((s) => s.room.playerName);
  const players = useAppSelector((s) => s.room.players);

  const me = players.find((p) => p.name === playerName);
  const isHost = me?.isHost ?? false;

  const handleStart = () => {
    if (!roomName) return;
    startGame(roomName);
  };

  return (
    <div className="lobby">
      <div className="lobby-head">
        <span className="lobby-eyebrow">ROOM</span>
        <h2 className="lobby-title">{roomName}</h2>
        <p className="lobby-sub">
          {isHost
            ? 'You are the host. Press start when ready.'
            : 'Waiting for the host to start the game…'}
        </p>
      </div>

      <h3 className="section-title">Players · {players.length}</h3>
      <ul className="player-list">
        {players.map((p) => (
          <li key={p.id} className={p.name === playerName ? 'is-me' : ''}>
            <span className={`avatar${p.isHost ? ' host' : ''}`}>
              {p.name.charAt(0).toUpperCase()}
            </span>
            <span className="name">{p.name}</span>
            {p.isHost && <span className="badge host">HOST</span>}
            {p.name === playerName && <span className="badge me">YOU</span>}
          </li>
        ))}
        {players.length === 0 && <li className="muted">— no players yet —</li>}
      </ul>

      {isHost ? (
        <button className="primary" onClick={handleStart}>
          start_game
        </button>
      ) : (
        <p className="muted small center">
          Only the host can start the round.
        </p>
      )}
    </div>
  );
};
