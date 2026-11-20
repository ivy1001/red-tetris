import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import game, { serverState, serverError, serverScores } from './game'
import { socket } from './socket'
import App from './App'
import './style.css'

const store = configureStore({ reducer: { game } })

socket.on('state', (s) => store.dispatch(serverState(s)))
socket.on('game_error', (e) => store.dispatch(serverError(e)))
socket.on('scores', (s) => store.dispatch(serverScores(s)))

createRoot(document.getElementById('tetris')).render(
  <Provider store={store}>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </Provider>
)
