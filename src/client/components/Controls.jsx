import React from 'react'

const KEYS = [
  [['←', '→'], 'Move'],
  [['↑'], 'Rotate'],
  [['↓'], 'Soft drop'],
  [['Space'], 'Hard drop'],
]

const Controls = () => (
  <dl className="controls">
    {KEYS.map(([caps, action]) => (
      <div key={action}>
        <dt>{caps.map((k) => <kbd key={k}>{k}</kbd>)}</dt>
        <dd>{action}</dd>
      </div>
    ))}
  </dl>
)

export default Controls
