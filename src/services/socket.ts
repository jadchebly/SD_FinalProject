import { io, Socket } from 'socket.io-client';

// Use production URL if in production, otherwise use development URL or fallback
const isProduction = import.meta.env.PROD;
const API_URL = isProduction
  ? (import.meta.env.VITE_BACKEND_URL_PRODUCTION || import.meta.env.VITE_API_URL || 'http://localhost:3000')
  : (import.meta.env.VITE_API_URL || 'http://localhost:3000');

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      transports: ['polling', 'websocket'], // Try polling first, then websocket
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      upgrade: true,
      rememberUpgrade: false,
    });

    socket.on('connect', () => {
      console.log('Socket.io connected, transport:', socket.io.engine.transport.name);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket.io disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.io connection error:', error);
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

