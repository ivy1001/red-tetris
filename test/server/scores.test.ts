import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ScoreBoard } from '../../src/server/scores';

const entry = (name: string, score: number) => ({ name, score, mode: 'classic', date: '2026-11-20' });

describe('ScoreBoard', () => {
  let file: string;
  beforeEach(() => {
    file = join(mkdtempSync(join(tmpdir(), 'scores-')), 'scores.json');
    process.env.SCORES_FILE = file;
  });
  afterEach(() => delete process.env.SCORES_FILE);

  it('starts empty, keeps the top 10 sorted, skips zero scores, and persists', () => {
    const board = new ScoreBoard();
    expect(board.top()).toEqual([]);
    board.record([entry('zero', 0)]);
    expect(board.top()).toEqual([]);
    board.record(Array.from({ length: 12 }, (_, i) => entry(`p${i}`, (i + 1) * 10)));
    expect(board.top()).toHaveLength(10);
    expect(board.top()[0]).toMatchObject({ name: 'p11', score: 120 });
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(board.top());
    expect(new ScoreBoard().top()).toEqual(board.top()); // reloaded from disk
  });

  it('ignores a corrupt or non-array file', () => {
    writeFileSync(file, '{oops');
    expect(new ScoreBoard().top()).toEqual([]);
    writeFileSync(file, '{"a":1}');
    expect(new ScoreBoard().top()).toEqual([]);
  });

  it('keeps scores in memory when the file cannot be written', () => {
    process.env.SCORES_FILE = join(file, 'not-a-dir', 'x.json');
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const board = new ScoreBoard();
    board.record([entry('a', 40)]);
    expect(board.top()).toHaveLength(1);
    expect(err).toHaveBeenCalled();
  });
});
