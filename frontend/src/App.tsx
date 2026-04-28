import { useState, type FC, type FormEvent } from 'react';
import {
  HashRouter,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom';
import { GamePage } from './pages/GamePage';

/** Tiny landing form — the canonical URL is /:room/:playerName. */
const Home: FC = () => {
  const [room, setRoom] = useState('lobby-1');
  const [name, setName] = useState('alice');
  const navigate = useNavigate();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!room.trim() || !name.trim()) return;
    navigate(`/${encodeURIComponent(room.trim())}/${encodeURIComponent(name.trim())}`);
  };

  return (
    <div className="page">
      <header className="topbar">
        <h1>RED TETRIS</h1>
      </header>
      <form className="home-form" onSubmit={handleSubmit}>
        <h3>Enter a room</h3>
        <label>
          Room
          <input value={room} onChange={(e) => setRoom(e.target.value)} />
        </label>
        <label>
          Your name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <button className="primary" type="submit">join</button>
        <p className="muted small">
          Or open <code>/:room/:playerName</code> directly.
        </p>
      </form>
    </div>
  );
};

const App: FC = () => (
  <HashRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/:room/:playerName" element={<GamePage />} />
    </Routes>
  </HashRouter>
);

export default App;
