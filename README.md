# Red Tetris

Networked multiplayer Tetris built with a Full Stack JavaScript / TypeScript stack.

- **Backend**: NestJS + socket.io — owns all game logic (server-authoritative)
- **Frontend**: React + Redux Toolkit + Vite — renders state, sends inputs

The server is the single source of truth: clients never run physics, line clears, or game-over checks. They emit raw key events and render whatever the server pushes back.

## Project layout

```
red-tetris/
├── backend/          NestJS server (game engine + socket.io gateway)
│   ├── src/game/
│   │   ├── entities/ Piece, Player, Game classes (OOP — subject requirement)
│   │   ├── dto/      Event payload + Swagger response types
│   │   ├── types/    Shared TypeScript types
│   │   ├── game.service.ts
│   │   ├── game.gateway.ts
│   │   └── game.controller.ts   (HTTP debug surface, Swagger)
│   └── test/         Jest test suites
├── frontend/         Vite + React SPA
│   └── src/
│       ├── socket/   socket.io-client singleton
│       ├── store/    Redux Toolkit slices (room, game)
│       ├── hooks/    useSocket, useKeyboard
│       ├── components/  Board, Cell, Spectrum, Lobby, GameOver
│       └── pages/    GamePage
└── README.md
```

## Prerequisites

- Node.js 18+
- npm

## Install

```bash
cd backend  && npm install
cd ../frontend && npm install
```

## Run — development (two processes)

```bash
# terminal 1
cd backend
npm run start:dev          # → http://localhost:3001  (HMR)

# terminal 2
cd frontend
npm run dev                # → http://localhost:5173  (HMR)
```

Open `http://localhost:5173/lobby-1/alice` in one browser tab and `http://localhost:5173/lobby-1/bob` in another. The first joiner is the host.

## Run — single-server mode (subject requirement)

The subject mandates: *"the server must also serve `index.html`, `bundle.js`, and any static assets via HTTP."* When `frontend/dist` exists, the backend serves it as the SPA root with proper client-side routing fallback.

```bash
cd frontend && npm run build
cd ../backend && npm run build
cd backend && npm run start:prod
# → open http://localhost:3001/lobby-1/alice
```

## Tests

```bash
cd backend
npm test                   # all suites
npm run test:cov           # with coverage report
```

Subject thresholds are 70% statements / 70% functions / 70% lines / 50% branches. Current run:

| Metric     | Required | Actual |
| ---------- | -------- | ------ |
| Statements | ≥ 70%    | ~89%   |
| Branches   | ≥ 50%    | ~74%   |
| Functions  | ≥ 70%    | ~97%   |
| Lines      | ≥ 70%    | ~92%   |

Test files cover: piece shapes & rotation, player board & spectrum, collision, line clearing, penalty distribution, host transfer, restart state reset, multi-room isolation, memory cleanup, and the 6 audit edge cases.

## URL routing

Subject format: `http://<host>:<port>/<room>/<player_name>`

```
/                         → small landing form
/:room/:playerName        → game lobby → board → game over
```

The first player in a room is host; the host alone can `start_game` / `restart_game`. If the host disconnects, the next player is promoted automatically. New players cannot join while a game is in progress.

## Socket protocol

### Client → Server

| Event           | Payload                                   |
| --------------- | ----------------------------------------- |
| `join_room`     | `{ roomName, playerName }`                |
| `start_game`    | `{ roomName }`                            |
| `restart_game`  | `{ roomName }`                            |
| `player_input`  | `{ roomName, input }`                     |

`input` ∈ `'left' | 'right' | 'rotate' | 'soft_drop' | 'hard_drop'`.

### Server → Client

| Event           | Payload                                       |
| --------------- | --------------------------------------------- |
| `room_state`    | `{ roomName, status, players, hostId, winner }` |
| `game_state`    | `{ status, isAlive, board, currentPiece, opponents }` |
| `game_started`  | `{}`                                          |
| `game_over`     | `{ winner }`                                  |
| `host_changed`  | `{ newHostId, newHostName }`                  |
| `error_event`   | `{ message }`                                 |

## Debug HTTP surface (Swagger)

Visit `http://localhost:3001/api/docs` for interactive Swagger UI. These endpoints exist for inspection / debugging only — **the real game flow runs over socket.io**.

- `GET /api/health`                       — liveness probe
- `GET /api/games`                        — list rooms
- `GET /api/games/:roomName`              — inspect a room
- `POST /api/games/:roomName/start`       — force-start (bypasses host check)
- `POST /api/games/:roomName/restart`     — force-restart
- `DELETE /api/games/:roomName`           — destroy a room

There's also a static `backend/socket-test.html` for manual socket exercising.

## Game rules (as implemented)

- Board: 10 cols × 20 rows
- All 7 original tetrominoes (I, O, T, S, Z, J, L) with classic 4-rotation states
- Constant fall speed (500 ms tick); piece locks one frame after touching the pile (subject requirement)
- All players in a room see the **same piece sequence** at the same indices
- When player **A** clears N lines (N ≥ 2), every other alive player receives **N − 1** indestructible penalty rows pushed up from the bottom
- Penalty rows cannot be cleared (rows containing penalty cells are skipped by `clearLines`)
- Each opponent's spectrum (max column heights) updates in real time
- Game ends when only one player remains alive (multiplayer) or when the lone player tops out (solo)

## Constraints honored

- Server-authoritative — clients send only key events; never compute physics
- Backend is OOP: `Piece`, `Player`, `Game` classes with prototype methods
- Frontend is purely functional: **`grep -rn '\bthis\b' frontend/src/` returns zero hits**
- No canvas, no SVG, no `<table>` — all layouts use CSS Grid / Flexbox
- No database / no persistence
- No secrets in repo


