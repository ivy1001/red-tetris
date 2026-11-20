import { io } from 'socket.io-client'

// Same origin as the page: the Nest server serves both (Vite proxies it in dev).
export const socket = io()
