import { Injectable } from '@nestjs/common';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface Score {
  name: string;
  score: number;
  mode: string;
  date: string;
}

// Bonus: top 10 scores, persisted to a JSON file (SCORES_FILE, default ./scores.json).
// ponytail: whole-file rewrite per game end; swap for a DB if this ever sees real traffic.
@Injectable()
export class ScoreBoard {
  readonly file = process.env.SCORES_FILE || join(process.cwd(), 'scores.json');
  private scores: Score[] = this.load();

  private load(): Score[] {
    try {
      const data = JSON.parse(readFileSync(this.file, 'utf8'));
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  top(): Score[] {
    return this.scores;
  }

  record(entries: Score[]): void {
    const kept = entries.filter((e) => e.score > 0);
    if (!kept.length) return;
    this.scores = [...this.scores, ...kept].sort((a, b) => b.score - a.score).slice(0, 10);
    try {
      writeFileSync(this.file, JSON.stringify(this.scores, null, 2));
    } catch (e) {
      // Never let a disk error take down a running game; scores stay in memory.
      console.error('Could not save scores:', (e as Error).message);
    }
  }
}
