import React from 'react'

const Cell = ({ value }) => {
  return (
    <div className={`cell ${value}`} />
  )
}

export default Cell