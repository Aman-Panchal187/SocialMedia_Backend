import { getIO } from '../config/socket.js';
import logger from '../config/logger.js';
import * as chatRepo from '../modules/chat/chat.repository.js';

export const registerChatHandlers = (io, socket) => {
  socket.on('chat:typing', async (payload) => {
    try {
      const conversationId = payload?.conversationId;
      if (!conversationId) return;

      const otherParticipant = await chatRepo.findOtherParticipant(conversationId, socket.userId);
      if (!otherParticipant) return;

      getIO().to(`user:${otherParticipant.userId}`).emit('chat:typing', {
        conversationId,
        userId: socket.userId,
        isTyping: Boolean(payload?.isTyping),
      });
    } catch (err) {
      logger.error(`Failed to relay chat:typing for user:${socket.userId}: ${err.message}`);
    }
  });
};
