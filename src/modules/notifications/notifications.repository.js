import { Op } from 'sequelize';
import db from '../../models/index.js';

const { Notification, User } = db;

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
