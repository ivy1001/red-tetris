import React from 'react'

// 3×5 bitmaps: the logo is built from the same cells as the board.
const LETTERS = {
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  E: ['###', '#..', '##.', '#..', '###'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  S: ['.##', '#..', '.#.', '..#', '##.'],
}

const WORDS = [
  [['R', 'red'], ['E', 'red'], ['D', 'red']],
  [['T', 'cyan'], ['E', 'yellow'], ['T', 'purple'], ['R', 'green'], ['I', 'orange'], ['S', 'blue']],
]

const Letter = ({ char, color, offset }) => (
  <span className="logo-letter">
    {LETTERS[char].flatMap((row, r) =>
      [...row].map((v, c) => (
        <span
          key={`${r}-${c}`}
          className={v === '#' ? `cell ${color}` : 'logo-gap'}
          style={v === '#' ? { '--drop': `${(offset + c) * 45 + (4 - r) * 30}ms` } : undefined}
        />
      ))
    )}
  </span>
)

const Logo = ({ size = 'big' }) => (
  <div className={`logo logo-${size}`} role="img" aria-label="Red Tetris">
    {WORDS.map((word, w) => (
      <div className="logo-word" key={w}>
        {word.map(([char, color], i) => (
          <Letter key={i} char={char} color={color} offset={w * 4 + i * 3} />
        ))}
      </div>
    ))}
  </div>
)

export default Logo
