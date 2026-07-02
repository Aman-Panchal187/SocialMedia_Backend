import { verifyAccessToken } from '../utils/tokenUtils.js';
import logger from '../config/logger.js';
import { registerPresenceHandlers } from './presence.socket.js';
import { registerChatHandlers } from './chat.socket.js';
import { registerCallHandlers } from './call.socket.js';

const registerSocketHandlers = (io) => {
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = verifyAccessToken(token);
      socket.userId = payload.userId;
      return next();
    } catch {
      return next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const room = `user:${socket.userId}`;
    socket.join(room);
    logger.debug(`Socket connected: user=${socket.userId} socket=${socket.id} room=${room}`);

    registerPresenceHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerCallHandlers(io, socket);

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: user=${socket.userId} socket=${socket.id}`);
    });
  });
};

export default registerSocketHandlers;
