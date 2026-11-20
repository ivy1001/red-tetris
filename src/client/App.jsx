import React from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { hashRoute } from './game'
import LandingPage from './components/LandingPage'
import Room from './components/Room'

// `/` also accepts the hash form `/#room[player]`.
const Home = () => {
  const to = hashRoute(useLocation().hash)
  return to ? <Navigate to={to} replace /> : <LandingPage />
}

const App = () => (
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/:room/:name" element={<Room />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
)

export default App
