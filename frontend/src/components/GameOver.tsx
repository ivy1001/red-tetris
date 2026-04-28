import type { FC } from 'react';
import { restartGame } from '../socket/api';
import { useAppSelector } from '../store/hooks';

export const GameOver: FC = () => {
  const roomName = useAppSelector((s) => s.room.roomName);
  const playerName = useAppSelector((s) => s.room.playerName);
  const players = useAppSelector((s) => s.room.players);
  const winner = useAppSelector((s) => s.room.winner);

  const me = players.find((p) => p.name === playerName);
  const isHost = me?.isHost ?? false;

  const handleRestart = () => {
    if (!roomName) return;
    restartGame(roomName);
  };

  return (
    <div className="gameover">
      <h2>Game Over</h2>
      {winner ? (
        <p className="winner">
          Winner: <strong>{winner}</strong>
          {winner === playerName && <span className="badge me">that's you</span>}
        </p>
      ) : (
        <p className="muted">No survivors.</p>
      )}

      <h3>Players</h3>
      <ul className="player-list">
        {players.map((p) => (
          <li key={p.id}>
            <span className="name">{p.name}</span>
            {p.isHost && <span className="badge host">HOST</span>}
            {p.name === playerName && <span className="badge me">YOU</span>}
          </li>
        ))}
      </ul>

      {isHost ? (
        <button className="primary" onClick={handleRestart}>
          restart_game
        </button>
      ) : (
        <p className="muted small">Waiting for host to restart…</p>
      )}
    </div>
  );
};
