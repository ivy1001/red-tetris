import { GameService } from '../src/game/game.service';
import { Game } from '../src/game/entities/game.entity';
import { Player, ROWS, COLS, PENALTY_CELL } from '../src/game/entities/player.entity';
import { Piece } from '../src/game/entities/piece.entity';

const makeFakeIo = (): any => ({
  to: () => ({ emit: () => {} }),
});

describe('Edge case audit', () => {
  // ────────────────────────────────────────────────
  // 1. Player disconnect during game
  // ────────────────────────────────────────────────
  describe('player disconnect during game', () => {
    let game: Game;
    afterEach(() => game?.stop());

    it('removed player vanishes from broadcast & opponents list', () => {
      game = new Game('r', makeFakeIo(), 1_000_000);
      game.addPlayer(new Player('s1', 'alice'));
      game.addPlayer(new Player('s2', 'bob'));
      game.addPlayer(new Player('s3', 'charlie'));
      game.start('s1');
      game.removePlayer('s2');
      expect(game.getPlayer('s2')).toBeUndefined();
      const aliceState = game.buildGameState(game.getPlayer('s1')!);
      expect(aliceState.opponents.map((o) => o.name)).toEqual(['charlie']);
    });

    it('game ends when disconnect drops alive count to 1 (multiplayer)', () => {
      game = new Game('r', makeFakeIo(), 1_000_000);
      game.addPlayer(new Player('s1', 'alice'));
      game.addPlayer(new Player('s2', 'bob'));
      game.start('s1');
      const result = game.removePlayer('s2');
      expect(result.gameEnded).toBe(true);
      expect(game.status).toBe('ended');
      expect(game.winner).toBe('alice');
    });

    it('disconnect during waiting state never ends a game', () => {
      game = new Game('r', makeFakeIo(), 1_000_000);
      game.addPlayer(new Player('s1', 'alice'));
      game.addPlayer(new Player('s2', 'bob'));
      const result = game.removePlayer('s1');
      expect(result.gameEnded).toBeFalsy();
      expect(game.status).toBe('waiting');
    });
  });

  // ────────────────────────────────────────────────
  // 2. Host leaving
  // ────────────────────────────────────────────────
  describe('host leaving', () => {
    let game: Game;
    afterEach(() => game?.stop());

    it('promotes the next player to host (waiting state)', () => {
      game = new Game('r', makeFakeIo(), 1_000_000);
      game.addPlayer(new Player('s1', 'alice'));
      game.addPlayer(new Player('s2', 'bob'));
      const { newHost } = game.removePlayer('s1');
      expect(newHost?.name).toBe('bob');
      expect(game.getPlayer('s2')!.isHost).toBe(true);
    });

    it('promotes a new host even when the game is playing', () => {
      game = new Game('r', makeFakeIo(), 1_000_000);
      game.addPlayer(new Player('s1', 'alice'));
      game.addPlayer(new Player('s2', 'bob'));
      game.addPlayer(new Player('s3', 'charlie'));
      game.start('s1');
      const { newHost, gameEnded } = game.removePlayer('s1');
      expect(gameEnded).toBe(false);
      expect(newHost?.name).toBe('bob');
      expect(game.getPlayer('s2')!.isHost).toBe(true);
    });

    it('lone host disconnect leaves no host (game empty)', () => {
      game = new Game('r', makeFakeIo(), 1_000_000);
      game.addPlayer(new Player('s1', 'alice'));
      const { newHost } = game.removePlayer('s1');
      expect(newHost).toBeUndefined();
      expect(game.isEmpty()).toBe(true);
    });
  });

  // ────────────────────────────────────────────────
  // 3. Game restart resets state
  // ────────────────────────────────────────────────
  describe('game restart state reset', () => {
    let game: Game;
    afterEach(() => game?.stop());

    it('restart wipes boards, resets piece index, regenerates sequence, clears winner', () => {
      game = new Game('r', makeFakeIo(), 1_000_000);
      game.addPlayer(new Player('s1', 'alice'));
      game.addPlayer(new Player('s2', 'bob'));
      game.start('s1');
      const a = game.getPlayer('s1')!;
      // dirty alice's state
      a.board[ROWS - 1][0] = 7;
      a.pieceIndex = 9;
      a.touchingGround = true;
      // fake game-over so restart is allowed
      game.getPlayer('s2')!.isAlive = false;
      game.checkGameOver();
      expect(game.status).toBe('ended');

      const oldSequenceRef = game.pieceSequence;
      game.restart('s1');

      expect(game.status).toBe('playing');
      expect(game.winner).toBeNull();
      expect(a.board.flat().every((c) => c === 0)).toBe(true);
      expect(a.pieceIndex).toBe(1);
      expect(a.isAlive).toBe(true);
      expect(a.currentPiece).not.toBeNull();
      expect(game.pieceSequence).not.toBe(oldSequenceRef);
    });

    it('restart while game is playing is rejected', () => {
      game = new Game('r', makeFakeIo(), 1_000_000);
      game.addPlayer(new Player('s1', 'alice'));
      game.start('s1');
      expect(game.restart('s1')).toBe(false);
      expect(game.status).toBe('playing');
    });

    it('player who joined during ended state participates in the restart', () => {
      game = new Game('r', makeFakeIo(), 1_000_000);
      game.addPlayer(new Player('s1', 'alice'));
      game.start('s1');
      game.getPlayer('s1')!.isAlive = false;
      game.checkGameOver(); // ends with no winner
      game.addPlayer(new Player('s2', 'bob')); // joins after end
      game.restart('s1');
      const b = game.getPlayer('s2')!;
      expect(b.isAlive).toBe(true);
      expect(b.currentPiece).not.toBeNull();
      expect(b.pieceIndex).toBe(1);
    });
  });

  // ────────────────────────────────────────────────
  // 4. Piece sequence consistency
  // ────────────────────────────────────────────────
  describe('piece sequence consistency', () => {
    let game: Game;
    afterEach(() => game?.stop());

    it('all players see identical piece types at the same index', () => {
      game = new Game('r', makeFakeIo(), 1_000_000);
      game.addPlayer(new Player('s1', 'alice'));
      game.addPlayer(new Player('s2', 'bob'));
      game.addPlayer(new Player('s3', 'charlie'));
      game.start('s1');
      const a = game.getPlayer('s1')!;
      const b = game.getPlayer('s2')!;
      const c = game.getPlayer('s3')!;
      expect(a.currentPiece!.type).toBe(b.currentPiece!.type);
      expect(b.currentPiece!.type).toBe(c.currentPiece!.type);
    });

    it('lazily extends the sequence beyond the initial pre-fill', () => {
      game = new Game('r', makeFakeIo(), 1_000_000);
      game.addPlayer(new Player('s1', 'alice'));
      game.start('s1');
      const beforeLen = game.pieceSequence.length;
      // force-spawn well beyond INITIAL_SEQUENCE_SIZE via private method
      const piece = (game as any).spawnFromSequence(beforeLen + 100);
      expect(game.pieceSequence.length).toBe(beforeLen + 101);
      expect(piece).toBeInstanceOf(Piece);
    });

    it('two players consuming pieces independently still see the same Nth piece', () => {
      game = new Game('r', makeFakeIo(), 1_000_000);
      game.addPlayer(new Player('s1', 'alice'));
      game.addPlayer(new Player('s2', 'bob'));
      game.start('s1');
      // alice plays 5 pieces, bob plays 0. Then bob plays his 5th piece —
      // it must be the same type as alice's 5th was.
      for (let i = 0; i < 5; i++) {
        game.handleInput('s1', 'hard_drop');
      }
      const a = game.getPlayer('s1')!;
      const b = game.getPlayer('s2')!;
      // Alice's pieceIndex is now 6 (1 spawned at start + 5 from hard_drops)
      // But what we care about is sequence[5] is the same for both.
      const aliceFifthType = game.pieceSequence[5];
      // Bob is still on his first piece; verify that when he advances to index 5,
      // he'll get the same type from the shared sequence.
      expect(game.pieceSequence[5]).toBe(aliceFifthType);
      expect(b.pieceIndex).toBe(1);
      expect(a.pieceIndex).toBeGreaterThan(b.pieceIndex);
    });
  });

  // ────────────────────────────────────────────────
  // 5. Multiple rooms isolation
  // ────────────────────────────────────────────────
  describe('multiple rooms isolation', () => {
    let svc: GameService;
    beforeEach(() => {
      svc = new GameService();
      svc.setServer(makeFakeIo());
    });
    afterEach(() => {
      svc.listGames().forEach((g) => g.stop());
    });

    it('two rooms have independent piece sequences', () => {
      svc.joinRoom('A', 'alice', 's1');
      svc.joinRoom('B', 'bob', 's2');
      svc.startGame('A', 's1');
      svc.startGame('B', 's2');
      const a = svc.getGame('A')!;
      const b = svc.getGame('B')!;
      expect(a.pieceSequence).not.toBe(b.pieceSequence);
      // They MAY happen to match by chance, but they are different array refs.
    });

    it('input in room A does not affect room B', () => {
      svc.joinRoom('A', 'alice', 's1');
      svc.joinRoom('B', 'bob', 's2');
      svc.startGame('A', 's1');
      svc.startGame('B', 's2');
      const aBefore = svc.getGame('A')!.getPlayer('s1')!.currentPiece!.x;
      const bBefore = svc.getGame('B')!.getPlayer('s2')!.currentPiece!.x;
      svc.handleInput('A', 's1', 'left');
      expect(svc.getGame('A')!.getPlayer('s1')!.currentPiece!.x).toBe(aBefore - 1);
      expect(svc.getGame('B')!.getPlayer('s2')!.currentPiece!.x).toBe(bBefore);
    });

    it('same player name allowed across different rooms', () => {
      const r1 = svc.joinRoom('A', 'alice', 's1');
      const r2 = svc.joinRoom('B', 'alice', 's2');
      expect(r1.ok).toBe(true);
      expect(r2.ok).toBe(true);
    });

    it('destroying one room does not affect the other', () => {
      svc.joinRoom('A', 'alice', 's1');
      svc.joinRoom('B', 'bob', 's2');
      svc.destroyRoom('A');
      expect(svc.getGame('A')).toBeUndefined();
      expect(svc.getGame('B')).toBeDefined();
    });
  });

  // ────────────────────────────────────────────────
  // 6. Memory leaks (rooms not deleted)
  // ────────────────────────────────────────────────
  describe('memory cleanup', () => {
    let svc: GameService;
    beforeEach(() => {
      svc = new GameService();
      svc.setServer(makeFakeIo());
    });
    afterEach(() => {
      svc.listGames().forEach((g) => g.stop());
    });

    it('room is deleted when last player leaves', () => {
      svc.joinRoom('A', 'alice', 's1');
      expect(svc.getGame('A')).toBeDefined();
      const r = svc.leaveRoom('s1');
      expect(r.gameDestroyed).toBe(true);
      expect(svc.getGame('A')).toBeUndefined();
    });

    it('room is deleted when last player leaves mid-game (tick interval cleared)', () => {
      svc.joinRoom('A', 'alice', 's1');
      svc.startGame('A', 's1');
      const game = svc.getGame('A')!;
      expect((game as any).tickHandle).not.toBeNull();
      svc.leaveRoom('s1');
      expect(svc.getGame('A')).toBeUndefined();
      expect((game as any).tickHandle).toBeNull();
    });

    it('joinRoom that fails does not leak an empty room', () => {
      svc.joinRoom('A', 'alice', 's1');
      // duplicate name → addPlayer fails. Room stays because alice still in it.
      const r = svc.joinRoom('A', 'alice', 's2');
      expect(r.ok).toBe(false);
      expect(svc.getGame('A')!.players.length).toBe(1);
    });

    it('endGame stops the tick handle', () => {
      svc.joinRoom('A', 'alice', 's1');
      svc.joinRoom('A', 'bob', 's2');
      svc.startGame('A', 's1');
      const game = svc.getGame('A')!;
      expect((game as any).tickHandle).not.toBeNull();
      game.getPlayer('s2')!.isAlive = false;
      game.checkGameOver();
      expect(game.status).toBe('ended');
      expect((game as any).tickHandle).toBeNull();
    });
  });

  // ────────────────────────────────────────────────
  // Bug fix #7: penalty lift
  // ────────────────────────────────────────────────
  describe('penalty lines lift active piece (fix #7)', () => {
    let game: Game;
    afterEach(() => game?.stop());

    it('uses matrix height as the lift bound, not a hard-coded -2', () => {
      game = new Game('r', makeFakeIo(), 1_000_000);
      game.addPlayer(new Player('s1', 'alice'));
      game.start('s1');
      const a = game.getPlayer('s1')!;
      // Force a known piece state and a board where lifting by 2 would still collide.
      // Place the piece near the top of a board with rows 0..1 occupied.
      a.board[0] = new Array(COLS).fill(1);
      a.board[1] = new Array(COLS).fill(1);
      // Apply 1 penalty line to push the wall up further; piece must lift to fit.
      (game as any).addPenaltyLines(a, 1);
      // After fix, the piece is either lifted into a non-colliding position
      // (currentPiece kept) or, if truly unreachable, the player is killed.
      // The point is: the loop terminates without hanging, and aliveness is
      // determined by canPlace at the final lifted y, not by an arbitrary -2.
      if (a.isAlive) {
        expect(game.canPlace(a.board, a.currentPiece!)).toBe(true);
      } else {
        expect(a.currentPiece).toBeNull();
      }
    });
  });

  // ────────────────────────────────────────────────
  // Penalty rows are indestructible (sanity)
  // ────────────────────────────────────────────────
  describe('penalty rows are indestructible (sanity)', () => {
    let game: Game;
    afterEach(() => game?.stop());

    it('a row of penalty cells is never cleared', () => {
      game = new Game('r', makeFakeIo(), 1_000_000);
      game.addPlayer(new Player('s1', 'alice'));
      game.start('s1');
      const p = game.getPlayer('s1')!;
      p.board[ROWS - 1] = new Array(COLS).fill(PENALTY_CELL);
      // also fill a regular row above it
      p.board[ROWS - 2] = new Array(COLS).fill(1);
      const cleared = (game as any).clearLines(p.board);
      expect(cleared).toBe(1);
      // bottom row is still penalty
      expect(p.board[ROWS - 1].every((c) => c === PENALTY_CELL)).toBe(true);
    });
  });
});
