# Red Tetris: project guide and defense notes

This guide explains how the project works, end to end, and how to answer each question of the
evaluation scale. Short protocol reference: [README.md](README.md).

## Contents

1. [What the project is](#1-what-the-project-is)
2. [Stack](#2-stack)
3. [Running it](#3-running-it)
4. [Folder structure](#4-folder-structure)
5. [Architecture and responsibilities](#5-architecture-and-responsibilities)
6. [Network protocol](#6-network-protocol)
7. [Workflows, step by step](#7-workflows-step-by-step)
8. [Game rules: how each one is implemented](#8-game-rules-how-each-one-is-implemented)
9. [Client in detail](#9-client-in-detail)
10. [Server in detail](#10-server-in-detail)
11. [Tests and coverage](#11-tests-and-coverage)
12. [Bonus features](#12-bonus-features)
13. [Evaluation scale, question by question](#13-evaluation-scale-question-by-question)
14. [Questions you may be asked](#14-questions-you-may-be-asked)
15. [Known limits](#15-known-limits)

---

## 1. What the project is

A multiplayer Tetris that runs in the browser. Every player has their own 10 × 20 board and gets
the same pieces in the same order. Clearing `n` lines at once sends `n - 1` indestructible penalty
lines to every opponent. Each player sees the opponents' names and their "spectrum" (the height of
each column). The last player standing wins. Solo play works too.

## 2. Stack

| Part | Technology | Why |
|---|---|---|
| Client | React 18 (function components and hooks) | Subject recommends React and hooks; hooks avoid `this` |
| Client state | Redux Toolkit (`createSlice`, `configureStore`) | Subject recommends Redux; RTK is its current official form |
| Routing | react-router 6 (`BrowserRouter`) | Subject asks for BrowserRouter or MemoryRouter |
| Client to server | socket.io-client 4, wrapped in a Redux middleware | Scale: "socket.io completely encapsulated in a middleware" |
| Bundler | Vite 5, builds `build/bundle.js` | Modern replacement of the boilerplate's webpack 1 |
| Server | NestJS 10 + socket.io 4, TypeScript | Object-oriented by design; TypeScript is allowed by the subject |
| Tests | Vitest + Testing Library + jsdom | One runner and one coverage report for client and server |

All libraries are current versions ("avoid outdated libraries" in the subject).

## 3. Running it

```bash
npm install
npm run build        # client -> build/ (index.html, bundle.js, index.css); server -> dist/
npm start            # http://localhost:3004
```

Open `http://localhost:3004/<room>/<player_name>` or `http://localhost:3004/#<room>[<player_name>]`,
or use the home page form.

| Command | What it does |
|---|---|
| `npm run client-dev` | Client with hot reload on port 5173; socket traffic is proxied to port 3004 |
| `npm run srv-dev` | Server in watch mode on port 3004 |
| `npm test` | All tests once |
| `npm run coverage` | Tests + coverage table; fails if under 70 % statements / functions / lines or 50 % branches |

Environment variables (optional, never committed; `.env` is in `.gitignore`):

| Variable | Default | Use |
|---|---|---|
| `PORT` | `3004` | HTTP + socket.io port |
| `SCORES_FILE` | `./scores.json` | Where the best scores are saved (bonus) |

To test multiplayer on one computer, open several tabs or windows. Each tab is its own socket, so
it counts as its own player.

## 4. Folder structure

```
index.html                  page loaded by the browser; Vite injects bundle.js into it
vite.config.mjs             client build (outputs build/bundle.js) + test/coverage config
tsconfig.json, nest-cli.json  server build (outputs dist/)
src/
  client/                   browser code: React, no `this`
    main.jsx                creates the store (with the socket middleware) and renders <App/>
    App.jsx                 routes: "/" home (+ hash URL redirect), "/:room/:name" game room
    game.js                 Redux slice + pure helpers (roomView, validName, hashRoute, KEYS, MODES)
    middleware/socket.js    the ONLY place that talks to socket.io
    components/
      LandingPage.jsx       name/room form, best scores, controls
      Room.jsx              board, next piece, score, opponents' spectrums, overlays, keyboard
      Logo.jsx              "RED TETRIS" logo built from board cells
      Controls.jsx          keyboard legend
      Cell.jsx              one board cell (<div class="cell red">)
    style.css               all styles: grid and flexbox only
  server/                   Node code: object-oriented
    main.ts                 starts Nest, serves build/ over HTTP, SPA fallback to index.html
    app.module.ts           Nest module: GameGateway + ScoreBoard
    scores.ts               ScoreBoard class: best 10 scores in a JSON file (bonus)
    game/
      tetris.ts             PURE functions: shapes, rotate, collides, merge, clearLines, addPenalty, spectrum...
      piece.ts              class Piece   (immutable: moved()/rotated() return new pieces)
      player.ts             class Player  (board, current piece, alive, score)
      game.ts               class Game    (players, host, status, shared piece sequence, gravity timer)
      game.gateway.ts       socket.io events -> Game methods; rooms map
test/
  client/                   reducer/helpers tests, component tests through the real middleware
  server/                   pure functions, Piece/Player/Game, gateway, ScoreBoard
```

## 5. Architecture and responsibilities

The server is the only game engine (server-authoritative). The client never computes game logic.
It sends key presses and draws what the server sends back.

```
 Browser (one per player)                         Node.js server (NestJS)
┌──────────────────────────────┐                 ┌───────────────────────────────────────┐
│ React components             │                 │ GameGateway  (socket.io events)        │
│   │ dispatch(emit('input'))  │                 │   rooms: Map<roomName, Game>           │
│   ▼                          │   socket.io     │        │                               │
│ socket middleware ───────────┼────────────────►│        ▼                               │
│   ▲   (only socket user)     │                 │ Game ── players: Player[] ── Piece     │
│   │ dispatch(serverState)    │◄────────────────┼─ 'state' to each player after         │
│ Redux store ──► components   │                 │   every change                         │
└──────────────────────────────┘                 │ uses pure functions from tetris.ts     │
                                                 │ ScoreBoard ── scores.json              │
                                                 │ HTTP: index.html, bundle.js, css       │
                                                 └───────────────────────────────────────┘
```

| Responsibility | Client | Server |
|---|---|---|
| URL parsing (`/room/name`, `/#room[name]`) | ✅ | |
| Keyboard → input event | ✅ | |
| Rendering board, spectrums, overlays | ✅ | |
| Validating room / player names | ✅ (hint only) | ✅ (enforced) |
| Rooms, players, host, start/restart rights | | ✅ |
| Piece sequence (same for everyone) | | ✅ |
| Gravity timer, movement, rotation, collisions | | ✅ |
| Locking, line clears, penalties, game over, winner | | ✅ |
| Spectrum computation | | ✅ |
| Scores, modes, saved scores (bonus) | | ✅ |
| Serving `index.html` / `bundle.js` | | ✅ |

Why the server owns everything: all players must see the same game. If clients computed it, a
slow or modified client could desync or cheat (for example by reporting fake line clears).

## 6. Network protocol

Client → server:

| Event | Payload | Effect |
|---|---|---|
| `join` | `{ room, name }` | Join or create the room. Refused if a round is running, the name is taken, or a name is invalid (`[A-Za-z0-9_-]`, 1–20 chars) |
| `start` | `'classic' \| 'invisible' \| 'gravity'` (optional) | Host only: start, or restart after a round ended |
| `input` | `'left' \| 'right' \| 'rotate' \| 'down' \| 'drop'` | Move the falling piece |
| `leave` | – | Leave the room (same as closing the tab) |
| `scores` | – | Ask for the best scores |

Server → client:

| Event | Payload |
|---|---|
| `state` | `{ room, status, host, winner, mode, me, alive, score, board, next, players: [{ name, alive, score, spectrum }] }` |
| `game_error` | `{ message }`: why the last request was refused |
| `scores` | `[{ name, score, mode, date }]`: the best 10 |

- `status` is `waiting` (lobby), `playing`, or `ended`.
- `board` is 20 rows × 10 cells. Each cell is `'empty'`, `'penalty'`, `'ghost'` or a color
  (`cyan blue orange yellow green purple red`). The falling piece is already drawn in.
- `spectrum` is 10 numbers: the height (0–20) of each column.
- `state` is sent to each player separately (their own board + everyone's spectrum), after every
  tick, input, join, leave and start.

## 7. Workflows, step by step

### 7.1 Opening the game URL

1. The browser asks the server for `/myroom/alice`. The server has no such file, so it returns
   `index.html` (SPA fallback in `main.ts`). The page loads `bundle.js`.
2. React Router matches `/:room/:name` and renders `Room`. (For `/#myroom[alice]`, the home
   route reads the hash with `hashRoute()` and redirects to `/myroom/alice`.)
3. `Room` dispatches `emit('join', { room, name })`.
4. The socket middleware sends `join` to the server (or waits for the connection first).
5. `GameGateway.join` validates the names, finds or creates the `Game`, and calls
   `game.addPlayer()`. The first player in the room is the host.
6. `Game` calls its `onChange` callback, and the gateway sends `state` to every player in the room.
7. The middleware turns `state` into the `serverState` Redux action; the reducer stores it;
   `Room` re-renders with the lobby overlay.

### 7.2 Starting a round (host only)

1. The host picks a mode and clicks **Start game**: `emit('start', 'classic')`.
2. `Game.start(id, mode)` checks the caller is the host and the game isn't running, then:
   resets every player, clears the piece sequence, sets `status = 'playing'`, gives each player
   the first piece, and starts the gravity timer (`setInterval`, 500 ms; 150 ms in high gravity).
3. Everybody receives `state` with `status: 'playing'`.

### 7.3 A gravity tick (every 500 ms)

For each player still alive, in order:
1. Try to move the piece down one row.
2. If it can't move: **lock** it (merge into the board), clear full lines, add score, send
   penalties, spawn the next piece. If the piece locked partly above the top row, or the next
   piece doesn't fit, that player is out.
3. Check whether the round is over.

Then `state` goes to everyone. This loop, plus the socket event handlers, is the server's
"asynchronous loop" from the subject.

### 7.4 A key press

1. `Room` listens to `keydown`: ← → ↑ ↓ and Space map to `left right rotate down drop`.
2. It dispatches `emit('input', 'left')`; the middleware sends it.
3. `Game.handleInput` ignores it unless the game is running and the player is alive, then:
   - `left` / `right` / `down`: move if the new spot is free
   - `rotate`: rotate clockwise if the rotated piece fits
   - `drop`: hard drop, which locks immediately
4. `state` goes to everyone, so opponents see spectrum changes right away.

### 7.5 Clearing lines and sending penalties

1. A piece locks; `clearLines()` removes every full row and counts them (`n`).
2. If `n > 1`, every other alive player gets `n - 1` penalty rows via `receivePenalty()`:
   - their board moves up by `n - 1` rows, and striped `'penalty'` rows are added at the bottom
   - if real blocks are pushed out of the top, that player is out
   - if the falling piece now overlaps blocks, it is pushed up (`liftY()`, a pure function)
3. Penalty rows are never cleared (`clearLines` skips rows that contain a penalty cell).

### 7.6 End of a round and restart

- With 2 or more players at the start: the round ends when 1 or 0 players are alive. The last one
  alive is the `winner`.
- Solo: the round ends when the player tops out.
- When the round ends: the timer stops, `status = 'ended'`, scores are saved (bonus), and the host
  sees **Play again**. While `ended`, new players may join; they play in the next round.

### 7.7 A player leaves or closes the tab

1. Closing the tab disconnects the socket (or the client sends `leave` when going back home).
2. `GameGateway.handleDisconnect` → `game.removePlayer()`.
3. The host is always `players[0]`, so if the host leaves, the next player becomes host.
4. If that leaves only one player alive in a running round, that player wins.
5. When a room is empty, it is deleted.
6. If the connection drops and comes back, the middleware joins the same room again by itself.

## 8. Game rules: how each one is implemented

| Rule | Where | How |
|---|---|---|
| 10 × 20 field | `tetris.ts` `ROWS`, `COLS`, `emptyBoard()` | 20 arrays of 10 cells |
| 7 original tetriminos and rotations | `tetris.ts` `SHAPES`, `rotate()` | Each piece is a matrix in its rotation box (I: 4×4, O: 2×2, others: 3×3). Rotating the matrix clockwise gives exactly the 4 states in the subject's picture |
| Same pieces, same positions, for everyone | `game.ts` `pieceAt()`, `piece.ts` constructor | One `sequence` array per game, filled lazily with random pieces. Each player has their own `pieceIndex`, so a player who is slower still gets the same piece #10 later. Every piece spawns at the same coordinates: centered (`x = 3`, `x = 4` for O), top row |
| Collisions | `tetris.ts` `collides()` | A cell collides if it is outside the walls or floor, or on a non-empty cell. Cells above the top are allowed (pieces may rotate partly above the field) |
| Constant fall speed | `game.ts` `tick()` + `MODES` | One `setInterval` per game |
| Landed piece can still move until the next tick | `game.ts` `tick()` | A piece locks only when a tick can't move it down. So after landing there is one full tick to slide or rotate it |
| Hard drop locks at once ("except if you forced the fall") | `player.ts` `hardDrop()` | Drops to `dropY()` and locks in the same call |
| Soft drop | `game.ts` `handleInput('down')` | Moves down one row; never locks by itself |
| Line clear | `tetris.ts` `clearLines()` | Keeps rows with an empty or penalty cell; adds empty rows on top |
| `n - 1` indestructible penalty lines | `game.ts` `afterLock()`, `tetris.ts` `addPenalty()` | See 7.5 |
| Game over when a new piece can't enter | `player.ts` `spawn()`, `lock()` | If the new piece collides at spawn, `alive = false`. Same if a piece locks with blocks still above the top row (`aboveTop()`): the pile has left the field |
| Spectrum | `tetris.ts` `spectrum()` | For each column, `20 - index of the highest block` (0 if empty) |
| Last player standing wins | `game.ts` `checkEnd()` | See 7.6 |

## 9. Client in detail

- **No `this` anywhere in `src/client`.** Everything is functions: components are arrow functions,
  state lives in hooks (`useState`, `useEffect`) and Redux.
- **Redux store** (`main.jsx`): one slice, `game`, holding `{ server, error, scores }`.
  - `serverState`: the last `state` from the server
  - `serverError`: the last `game_error` message
  - `serverScores`: the best scores
  - `reset`: clears the room when leaving
- **Socket middleware** (`middleware/socket.js`): the only file that knows socket.io.
  - Components dispatch `emit(event, payload)`; the middleware calls `socket.emit`.
  - Server events (`state`, `game_error`, `scores`) become Redux actions.
  - It remembers the joined room and joins again after a reconnect.
  - The socket is created in `main.jsx` and passed in, so tests can use a fake socket.
- **Pure helpers** (`game.js`):
  - `roomView(state)` decides what the room screen shows: opponents, overlay title and text, button
  - `validName(name)`
  - `hashRoute('#room[name]')`
  - the reducer itself
- **Rendering**: the board is a CSS grid of `<div class="cell <value>">`. No `<table>`, canvas,
  SVG or jQuery. The logo is also made of cells.
- **SPA**: a single `index.html`; every screen change is client-side routing.

## 10. Server in detail

- **Object-oriented with prototypes.** `Piece`, `Player`, `Game` and `ScoreBoard` are ES classes,
  and ES classes are prototypes. Methods live on `Game.prototype`, and every game object's prototype
  is `Game.prototype`. Proof (after `npm run build`):
  ```bash
  node -e "const {Game}=require('./dist/game/game'); console.log(Object.getOwnPropertyNames(Game.prototype)); console.log(Object.getPrototypeOf(new Game('r',()=>{}))===Game.prototype)"
  ```
- **Board logic stays pure.** The classes keep state, but the board maths is in pure functions in
  `tetris.ts`. Each function returns a new board and never changes its input. For example,
  `Player.lock()` is `this.board = clearLines(merge(this.board, ...)).board`.
- **`Piece` is immutable**: `moved()` and `rotated()` return new pieces. A move is "build the
  candidate piece, check `collides()`, keep it if it fits".
- **`GameError extends Error`**: the custom error subclass for refused actions (not host, name
  taken...). The gateway turns it into a `game_error` event.
- **`GameGateway`** (`@WebSocketGateway`):
  - one handler per client event (`@SubscribeMessage`)
  - `handleDisconnect` for closed sockets
  - a `Map` of rooms to `Game`s
  - it validates every payload before using it (names, input values, mode with `Object.hasOwn`), so
    malformed messages can't crash the server
- **`main.ts`**: serves `build/` statically. Any other GET returns `index.html`, so URLs like
  `/room/alice` work on refresh. socket.io runs on the same port.
- **Concurrent games**: each room is its own `Game` with its own timer and sequence.

## 11. Tests and coverage

```bash
npm run coverage
```

| File | Tests |
|---|---|
| `test/server/game.test.ts` | Pure functions; `Piece`/`Player`; `Game`: host change, same pieces, gravity and lock timing, inputs, penalties, end of game, restart; bonus: ghost, invisible, scoring, modes |
| `test/server/game.gateway.test.ts` | Name validation, join/start/input/leave, host-only start, mode validation, scores |
| `test/server/scores.test.ts` | Top 10, saving and reloading, corrupt file, unwritable file |
| `test/client/game.test.js` | Reducer, `roomView`, `validName`, `hashRoute` |
| `test/client/components.test.jsx` | Home and room screens through the real socket middleware with a fake socket: join, reconnect, start, keys, errors, spectrums, hash URL |

Coverage is about 99 % statements / lines / functions and about 98 % branches (required: 70 % / 50 %).
The thresholds are enforced in `vite.config.mjs`: `npm run coverage` fails if they are not met.

## 12. Bonus features

| Bonus | How to show it |
|---|---|
| **Scoring**: 40 / 100 / 300 / 1200 for 1 / 2 / 3 / 4 lines at once | Clear a line: the Score panel goes up; opponents show your score next to your name |
| **Saved scores**: best 10, written to `scores.json` at the end of each round | Finish a round with points, go back home: "Best scores" lists it. Restart the server: still there |
| **Game modes** (host chooses before each round) | **Invisible**: your landed blocks disappear (penalty rows stay visible). **High gravity**: pieces fall every 150 ms |
| **Next piece preview** | "Next" panel, same for all players |
| **Ghost piece** | Outline at the bottom showing where the piece will land (hidden in Invisible mode) |

The scale only grades bonuses if the mandatory part is perfect, so show the mandatory part first.

## 13. Evaluation scale, question by question

Before the defense:
1. `npm install && npm run build && npm start`
2. Open two or three tabs side by side.
3. Have a terminal ready for the grep commands below.

### Game functionalities

**Running the game in solo mode.** "A player can join a new game and launch it. The access URL is
faithful to the doc (hash-based): `http://<host>:<port>/#<room>[<player_name>]`."
- Demo: open `http://localhost:3004/#solo1[alice]`. You land in room `solo1` as `alice`, as host.
  Click **Start game** and play.
- Also works: `http://localhost:3004/solo1/alice`, which is the format of the current subject
  (v5.2), and the **Play solo** button on the home page.
- Explain: the scale was written for an older subject that used a hash URL. We support both.
  The hash form is read by `hashRoute()` and redirected by `App.jsx`.

**Launching the game in multiplayer mode.** "Multiple players can join. Only the first one can
launch it. A player cannot join a game in progress. Faithful to Tetris. Over when one player is left."
- Demo:
  1. Tab 1 `/#battle[alice]`, tab 2 `/#battle[bob]`.
  2. Bob sees "Waiting for alice to start the game" and has no Start button.
  3. Alice starts.
  4. Tab 3 `/#battle[cara]` shows "Can't join the room: Game already started, wait for the next round".
  5. Let bob top out: alice gets "You win", bob gets "alice wins".
- Code: `Game.start()` rejects anyone but `players[0]`; `Game.addPlayer()` rejects joins while
  `playing`; `Game.checkEnd()` ends the round.

**Relaunch a game.** "At the end, only the top player can relaunch. If they left, another player
replaces them. After the end and before relaunching, new players can join."
- Demo:
  1. After a round, only alice (host) has **Play again**.
  2. Close alice's tab: bob becomes host and gets the button.
  3. Before restarting, open `/#battle[cara]`: cara joins.
  4. Bob restarts with three players.
- Code: host is `players[0]` (the `host` getter); `removePlayer()` removes from the array, so the
  next player becomes `players[0]`; `addPlayer()` only refuses during `playing`.

**Blocks dispatch.** "Players receive the same sequence of blocks in the same position and coordinates."
- Demo: start with two tabs. The first piece and the "Next" preview are identical in both. Drop
  pieces quickly in one tab: the other still gets the same pieces in the same order when it gets there.
- Code: `Game.sequence` + `pieceAt(i)` (one shared list), `Player.pieceIndex` (each player's
  position in it), `Piece` constructor (same spawn x/y for everyone).

**Moving the blocks.** "Blocks rotate, move left/right, fall as documented. You can move a block
during a timer tick once it has landed, except if you forced the fall."
- Demo: ← → move, ↑ rotates, ↓ soft drops, Space hard drops. Let a piece fall onto the stack, then
  quickly press ← or →: it still slides. Hard drop: it locks at once.
- Code: `Game.tick()`: a piece locks only on a tick where it can't fall, so after landing there is
  one more tick to adjust. `Player.hardDrop()` locks in the same call.

**Line injection.** "When a player destroys lines, opponents receive n - 1 malus lines,
indestructible, at the base of their structure."
- Demo: clear 2+ lines at once in one tab. The other tab gets 1 striped grey line at the bottom,
  and its stack moves up. Fill a row that includes the striped line: it does not clear.
- Tip: a 2-line clear is easiest to set up with O pieces and an I piece.
- Code: `Game.afterLock()` → `Player.receivePenalty(n - 1)` → `addPenalty()`; `clearLines()` keeps
  rows containing `'penalty'`.
- Unit test: "sends n-1 penalty lines to opponents" in `test/server/game.test.ts`.

### Graphic interface

**Respect of the HTML / DOM constraints.** "Flexbox or grid instead of `<table>`. No canvas, no
SVG, no DOM library."
```bash
grep -rniE "<table|<canvas|<svg|jquery" src/client     # → nothing
grep -nE "display: (grid|flex)" src/client/style.css   # → the board, rows, panels, logo
```
The board is `display: grid` rows of `div.cell`. The logo is also cells. No direct DOM manipulation.

**Spectres visualization.** "Opponents identified by name, with the spectre of their structure;
every change shows."
- Demo: in the "Opponents" panel, each opponent has a name, score and a mini 10 × 20 spectrum.
  Drop a piece in one tab and the other tab's panel updates at once. Players who are out are dimmed
  and marked "Out".
- Code: `tetris.ts` `spectrum()` (server), sent in every `state`; drawn by `Opponent` in `Room.jsx`.

### Client implementation

**Socket.io encapsulation.** "The use of socket.io must be completely encapsulated in a middleware."
- Show `src/client/middleware/socket.js`. It is the only file that calls `socket.emit` / `socket.on`.
  The socket is created in `main.jsx` and handed to the middleware.
  ```bash
  grep -rn "socket\.emit\|socket\.on\|socket.io-client" src/client
  # → only middleware/socket.js and the io() call in main.jsx
  ```
- Explain: components dispatch `emit('input', 'left')`; incoming events become Redux actions
  (`serverState`, ...).

**Functional programming.** "Never use `this` except for Error subclasses. The logic for the blocks
must be pure functions."
```bash
grep -rnw "this" src/client     # → nothing
```
- Client: only function components and hooks; helpers in `game.js` are pure.
- Blocks logic: `src/server/game/tetris.ts`. `rotate`, `collides`, `merge`, `dropY`, `liftY`,
  `aboveTop`, `clearLines`, `addPenalty`, `spectrum`, `preview` and `hideStack` are all pure: same input, same output, no
  mutation, no side effects. The subject requires the *server* to be object-oriented, so `this`
  there is expected (see the next question).

### Server implementation

**Object oriented programming.** "Games and players management must be object programming."
- Show `piece.ts`, `player.ts`, `game.ts` (and `scores.ts`, `game.gateway.ts`).
- Run the prototype command from [section 10](#10-server-in-detail) to show the methods on
  `Game.prototype`.
- Explain: a `Game` object owns its `Player` objects, and each `Player` owns its `Piece`. The
  objects keep the state; the board maths are pure functions they call.

### Unitary tests

**Sufficient cover.** "`npm run coverage` must show ≥ 70 % statements, functions, lines and ≥ 50 % branches."
```bash
npm run coverage
```
The table ends around 99 % / 98 % / 99 % / 99 %. The command would fail below the thresholds.

### Bonus

See [section 12](#12-bonus-features). Score, saved scores and the two extra game modes are the
subject's own suggestions. The next-piece preview and the ghost piece are extras.

### Flags

- **Crash**: the server validates every socket payload, and the client handles malformed URLs and
  hashes. Wrong names, unknown inputs, unknown modes (including `toString` / `__proto__`) and
  malformed `%` escapes are all covered by tests.
- **Secrets**: none in the repo; `.env` is gitignored.

## 14. Questions you may be asked

**Why does the server do all the game logic?**
So every player sees the same truth. Clients only send key presses, so they can't desync or cheat.

**How do two players get the same pieces "even at different times"?**
The game has one piece list (`sequence`). Each player only has an index into it. Pieces are added
to the list the first time anyone needs that index, so a fast and a slow player read the same
entries at different moments.

**What is a pure function? Give an example.**
A function whose output depends only on its input and that changes nothing outside itself.
`clearLines(board)` returns a new board and a count; the input board is untouched.

**Why is `this` used on the server?**
The subject requires an object-oriented server with `Player`, `Piece` and `Game` classes. The
`this`-free rule is for the client.

**Class vs prototype?**
`class` is syntax for prototypes. `Game.prototype.start` exists, and every game object's
`__proto__` is `Game.prototype` (see the command in section 10).

**What is the "asynchronous loop"?**
Node's event loop. socket.io events (join, input...) and the `setInterval` gravity ticks each run
handlers that update the `Game` and emit `state`.

**How does the landed piece get "one more frame"?**
On a tick, a piece that can still fall falls. It locks only on a tick where it can't fall. So after
it lands there is one whole tick (500 ms) to slide or rotate it. If you slide it off an edge, it
keeps falling.

**How are penalties indestructible?**
Penalty cells have the value `'penalty'`, and `clearLines()` never removes a row containing one.

**What happens if a player refreshes during a round?**
The refresh disconnects them, so they leave the round. The page then tries to join again and gets
"Game already started": the subject forbids joining a running round. They can join for the next round.

**How does the client know what to draw?**
The server sends the finished board (falling piece and ghost already drawn in). The client maps
each cell value to a CSS class.

**Why NestJS / TypeScript / Vite instead of the boilerplate?**
The boilerplate uses webpack 1, Babel 6 and React 15, all outdated; the subject says to avoid outdated
libraries. NestJS gives a clean object-oriented server with socket.io support. TypeScript is
explicitly allowed.

**Where is the network protocol defined?**
[Section 6](#6-network-protocol) here, and in the README.

## 15. Known limits

- Rotation has no wall kicks: a rotation that would hit a wall or block is refused. The subject's
  picture only shows the rotation states.
- Keyboard only (no touch controls), as in the subject's input list.
- Fonts come from Google Fonts; without internet the page falls back to system fonts and still works.
- A player who refreshes during a round can't rejoin until it ends (subject rule).
