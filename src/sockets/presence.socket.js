import { getIO } from '../config/socket.js';
import logger from '../config/logger.js';
import db from '../models/index.js';
import * as chatRepo from '../modules/chat/chat.repository.js';

const onlineUsers = new Map();

export const isUserOnline = (userId) => (onlineUsers.get(userId) || 0) > 0;

const broadcastPresence = async (userId, isOnline) => {
  try {
    const partnerIds = await chatRepo.findAllConversationPartnerIds(userId);
    partnerIds.forEach((partnerId) => {
      getIO().to(`user:${partnerId}`).emit('presence:update', { userId, isOnline });
    });
  } catch (err) {
    logger.error(`Failed to broadcast presence for user:${userId}: ${err.message}`);
  }
};

export const registerPresenceHandlers = (io, socket) => {
  const { userId } = socket;
  const nextCount = (onlineUsers.get(userId) || 0) + 1;
  onlineUsers.set(userId, nextCount);
  if (nextCount === 1) {
    broadcastPresence(userId, true);
  }

  socket.on('disconnect', async () => {
    const remaining = (onlineUsers.get(userId) || 1) - 1;
    if (remaining <= 0) {
      onlineUsers.delete(userId);
      try {
        await db.User.update({ lastSeenAt: new Date() }, { where: { id: userId } });
      } catch (err) {
        logger.error(`Failed to update lastSeenAt for user:${userId}: ${err.message}`);
      }
      await broadcastPresence(userId, false);
    } else {
      onlineUsers.set(userId, remaining);
    }
  });
};
