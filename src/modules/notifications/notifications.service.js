import ApiError from '../../utils/ApiError.js';
import { parseLimit, decodeCursor, buildPaginatedResponse } from '../../utils/paginationUtils.js';
import { getIO } from '../../config/socket.js';
import logger from '../../config/logger.js';
import * as notificationsRepo from './notifications.repository.js';

const serializeNotification = (notification, followStatus) => ({
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
  // Only set for the single most recent follow_request notification per actor —
  // older ones from a prior follow/unfollow cycle are history, not actionable, and
  // omit this field entirely so the client renders them as plain notifications.
  ...(followStatus !== undefined ? { followStatus } : {}),
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
  // A freshly created follow_request notification is, by construction, the actor's
  // latest one, and the Follow row backing it is always 'pending' at this point
  // (an accepted follow is notified with type 'follow', not 'follow_request').
  const followStatus = type === 'follow_request' ? 'pending' : undefined;
  const serialized = serializeNotification(withActor, followStatus);

  await emitSafely(recipientId, serialized);
};

export const listNotifications = async (recipientId, { limit: rawLimit, cursor: rawCursor }) => {
  const limit = parseLimit(rawLimit);
  const cursor = decodeCursor(rawCursor);

  const rows = await notificationsRepo.findByRecipient({ recipientId, cursor, limit });
  const { items, nextCursor } = buildPaginatedResponse(rows, limit);

  const followRequestActorIds = [
    ...new Set(items.filter((item) => item.type === 'follow_request').map((item) => item.actorId)),
  ];
  const [followStatusMap, latestFollowRequestIdByActor] = await Promise.all([
    notificationsRepo.findFollowStatusMap(recipientId, followRequestActorIds),
    notificationsRepo.findLatestFollowRequestNotificationIdByActor(recipientId, followRequestActorIds),
  ]);

  return {
    items: items.map((item) => {
      const isLatestForActor = latestFollowRequestIdByActor.get(item.actorId) === item.id;
      const followStatus =
        item.type === 'follow_request' && isLatestForActor
          ? (followStatusMap.get(item.actorId) ?? null)
          : undefined;
      return serializeNotification(item, followStatus);
    }),
    nextCursor,
  };
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
