import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import { io } from 'socket.io-client'
import game from './game'
import { socketMiddleware } from './middleware/socket'
import App from './App'
import './style.css'

// Same origin as the page: the Nest server serves both (Vite proxies /socket.io in dev).
const store = configureStore({
  reducer: { game },
  middleware: (getDefault) => getDefault().concat(socketMiddleware(io())),
})

createRoot(document.getElementById('tetris')).render(
  <Provider store={store}>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </Provider>
)
