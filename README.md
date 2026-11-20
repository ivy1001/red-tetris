# Red Tetris

Networked multiplayer Tetris. Client: React + Redux Toolkit + react-router (`src/client`, built by Vite).
Server: NestJS + socket.io (`src/server`).

```
npm install
npm run build && npm start   # http://localhost:3004/<room>/<player_name>  (PORT env to change)
npm run srv-dev              # server in watch mode (:3004)
npm run client-dev           # client with hot reload (:5173, proxies sockets to :3004)
npm run coverage             # vitest, fails under 70% stmts/funcs/lines, 50% branches
```

Game URLs: `/<room>/<player_name>` or the hash form `/#<room>[<player_name>]`.
Full walkthrough, workflows and evaluation notes: [GUIDE.md](GUIDE.md).

The server serves `build/` (`index.html`, `bundle.js`, `index.css`), and `index.html` for any other GET
so the client router handles `/<room>/<player_name>`.

## Responsibilities

The server is authoritative: it owns boards, the shared piece sequence, gravity (500 ms tick),
collisions, line clears, penalties, game over and the winner (`src/server/game`: pure board functions
in `tetris.ts`, `Piece` / `Player` / `Game` classes). The client only sends key inputs and renders the
`state` it receives (no `this`, function components + hooks). All socket.io use is wrapped in a
Redux middleware (`src/client/middleware/socket.js`).

## Protocol (socket.io)

| Client → server | Payload | Notes |
|---|---|---|
| `join` | `{ room, name }` | 1–20 chars of `[A-Za-z0-9_-]`; refused while a round is running or if the name is taken |
| `start` | `'classic' \| 'invisible' \| 'gravity'` (optional, default classic) | host only; also restarts an ended round |
| `input` | `'left' \| 'right' \| 'rotate' \| 'down' \| 'drop'` | arrows / space |
| `leave` | – | same as disconnecting |
| `scores` | – | asks for the best scores |

| Server → client | Payload |
|---|---|
| `state` | `{ room, status: 'waiting'\|'playing'\|'ended', host, winner, mode, me, alive, score, board, next, players: [{ name, alive, score, spectrum }] }` |
| `scores` | `[{ name, score, mode, date }]`, best 10 |
| `game_error` | `{ message }` |

- `board` is 20×10 cells, falling piece and its landing ghost already drawn in: `'empty'`, `'penalty'`,
  `'ghost'`, or a color (`cyan blue orange yellow green purple red`), matching the client's `.cell.<value>` CSS.
- `next` is the next piece as a small grid of the same cell values (`null` when not playing).
- `spectrum` is 10 column heights (0–20). Opponents = `players` minus `me`.
- `state` is sent to every player of the room after each tick, input, join, leave and start.
- First player to join is host; if they leave, the next player in join order becomes host.
- A cleared batch of `n` lines sends `n - 1` indestructible penalty lines to every opponent.
- A multiplayer round ends when one player is left (`winner` = their name); solo ends on top-out.

## Bonus

- **Scoring**: 40 / 100 / 300 / 1200 points for 1 / 2 / 3 / 4 lines cleared at once.
- **Saved scores**: the best 10 are written to `scores.json` (path via `SCORES_FILE`, gitignored)
  at the end of every round and shown on the home screen.
- **Game modes** (picked by the host before each round): *Classic*; *Invisible* (your landed blocks
  disappear, only penalty lines stay visible); *High gravity* (pieces fall every 150 ms instead of 500 ms).
- **Next piece preview** and a **ghost piece** showing where the falling piece will land.
