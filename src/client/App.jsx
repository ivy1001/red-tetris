import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import LandingPage from './components/LandingPage'
import Room from './components/Room'

const App = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/:room/:name" element={<Room />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
)

export default App
