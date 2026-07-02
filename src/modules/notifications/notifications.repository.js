import { Op } from 'sequelize';
import db from '../../models/index.js';

const { Notification, User, Follow } = db;

export const actorAttrs = ['id', 'username', 'fullName', 'avatarUrl'];

export const createNotification = ({ recipientId, actorId, type, entityType, entityId }) =>
  Notification.create({ recipientId, actorId, type, entityType, entityId });

const buildCursorWhere = (cursor) => {
  if (!cursor) return {};
  return {
    [Op.or]: [
      { createdAt: { [Op.lt]: cursor.createdAt } },
      { createdAt: cursor.createdAt, id: { [Op.lt]: cursor.id } },
    ],
  };
};

export const findByRecipient = async ({ recipientId, cursor, limit }) => {
  const where = {
    recipientId,
    ...buildCursorWhere(cursor),
  };
  return Notification.findAll({
    where,
    include: [{ model: User, as: 'actor', attributes: actorAttrs }],
    order: [
      ['createdAt', 'DESC'],
      ['id', 'DESC'],
    ],
    limit: limit + 1,
  });
};

export const countUnread = (recipientId) => Notification.count({ where: { recipientId, isRead: false } });

export const markRead = async (notificationId, recipientId) => {
  const [affected] = await Notification.update(
    { isRead: true },
    { where: { id: notificationId, recipientId } }
  );
  return affected > 0;
};

export const markAllRead = (recipientId) =>
  Notification.update({ isRead: true }, { where: { recipientId, isRead: false } });

export const findById = (notificationId) => Notification.findByPk(notificationId, {
  include: [{ model: User, as: 'actor', attributes: actorAttrs }],
});

export const findFollowStatusMap = async (recipientId, actorIds) => {
  if (actorIds.length === 0) return new Map();
  const rows = await Follow.findAll({
    where: { followerId: { [Op.in]: actorIds }, followingId: recipientId },
  });
  return new Map(rows.map((row) => [row.followerId, row.status]));
};

// A given actor may have sent (and had rejected) several follow requests over time,
// each with its own notification row. Only the single most recent follow_request
// notification per actor reflects the current Follow row's status — older ones are
// history and must not be rendered as actionable.
export const findLatestFollowRequestNotificationIdByActor = async (recipientId, actorIds) => {
  if (actorIds.length === 0) return new Map();
  const rows = await Notification.findAll({
    where: { recipientId, actorId: { [Op.in]: actorIds }, type: 'follow_request' },
    attributes: ['id', 'actorId'],
    order: [
      ['createdAt', 'DESC'],
      ['id', 'DESC'],
    ],
  });
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.actorId)) map.set(row.actorId, row.id);
  }
  return map;
};
