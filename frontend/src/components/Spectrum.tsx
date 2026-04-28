import type { FC } from 'react';
import type { OpponentSummary } from '../types';

interface SpectrumProps {
  opponent: OpponentSummary;
}

export const Spectrum: FC<SpectrumProps> = ({ opponent }) => (
  <div className={`spectrum${opponent.isAlive ? '' : ' dead'}`}>
    <div className="spec-head">
      <span className={`spec-dot${opponent.isAlive ? '' : ' off'}`} />
      <span className="spec-name">{opponent.name}</span>
      {!opponent.isAlive && <span className="spec-tag">DOWN</span>}
      <span className="spec-score" title="score">
        {opponent.score.toLocaleString()}
      </span>
    </div>
    <div className="spec-bars">
      {opponent.spectrum.map((h, i) => (
        <div key={i} className="spec-col">
          <div
            className="spec-fill"
            style={{ height: `${(h / 20) * 100}%` }}
          />
        </div>
      ))}
    </div>
  </div>
);
