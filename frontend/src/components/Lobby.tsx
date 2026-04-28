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
      <h2>Room: {roomName}</h2>
      <p className="muted">
        Waiting for the host to start the game…
      </p>

      <h3>Players</h3>
      <ul className="player-list">
        {players.map((p) => (
          <li key={p.id}>
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
        <p className="muted small">Only the host can start.</p>
      )}
    </div>
  );
};
