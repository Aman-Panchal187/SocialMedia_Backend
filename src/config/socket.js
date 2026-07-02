import { Server } from 'socket.io';
import env from './env.js';

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: env.corsOrigin,
      credentials: true,
    },
  });
  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initSocket(httpServer) first.');
  }
  return io;
};

export default { initSocket, getIO };
