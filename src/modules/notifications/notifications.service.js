import ApiError from '../../utils/ApiError.js';
import { parseLimit, decodeCursor, buildPaginatedResponse } from '../../utils/paginationUtils.js';
import { getIO } from '../../config/socket.js';
import logger from '../../config/logger.js';
import * as notificationsRepo from './notifications.repository.js';

const serializeNotification = (notification) => ({
  id: notification.id,
  type: notification.type,
  entityType: notification.entityType,
  entityId: notification.entityId,
  isRead: notification.isRead,
  createdAt: notification.createdAt,
  actor: notification.actor
    ? {
        id: notification.actor.id,
        username: notification.actor.username,
        fullName: notification.actor.fullName,
        avatarUrl: notification.actor.avatarUrl,
      }
    : undefined,
});

const emitSafely = async (recipientId, serialized) => {
  try {
    getIO().to(`user:${recipientId}`).emit('notification:new', serialized);
    const count = await notificationsRepo.countUnread(recipientId);
    getIO().to(`user:${recipientId}`).emit('notification:unread-count', { count });
  } catch (err) {
    // A live-delivery failure (socket layer not initialized, emit error, etc.)
    // must never break the REST action that triggered the notification.
    logger.error(`Failed to emit realtime notification to user:${recipientId}: ${err.message}`);
  }
};

export const notifyUser = async ({ recipientId, actorId, type, entityType, entityId }) => {
  if (recipientId === actorId) return;

  const created = await notificationsRepo.createNotification({ recipientId, actorId, type, entityType, entityId });
  const withActor = await notificationsRepo.findById(created.id);
  const serialized = serializeNotification(withActor);

  await emitSafely(recipientId, serialized);
};

export const listNotifications = async (recipientId, { limit: rawLimit, cursor: rawCursor }) => {
  const limit = parseLimit(rawLimit);
  const cursor = decodeCursor(rawCursor);

  const rows = await notificationsRepo.findByRecipient({ recipientId, cursor, limit });
  const { items, nextCursor } = buildPaginatedResponse(rows, limit);

  return { items: items.map(serializeNotification), nextCursor };
};

export const getUnreadCount = async (recipientId) => {
  const count = await notificationsRepo.countUnread(recipientId);
  return { count };
};

export const markAsRead = async (notificationId, recipientId) => {
  const wasMarked = await notificationsRepo.markRead(notificationId, recipientId);
  if (!wasMarked) throw ApiError.notFound('Notification not found');
};

export const markAllAsRead = async (recipientId) => {
  await notificationsRepo.markAllRead(recipientId);
};
