import { Op } from 'sequelize';
import db from '../../models/index.js';

const { Follow, User } = db;

export const publicAttrs = ['id', 'username', 'fullName', 'avatarUrl'];

export const findUserByUsername = (username) => User.findOne({ where: { username } });

export const findFollowRow = (followerId, followingId) =>
  Follow.findOne({ where: { followerId, followingId } });

export const createFollow = (followerId, followingId, status) =>
  Follow.create({ followerId, followingId, status });

export const destroyFollow = (row) => row.destroy();

export const updateFollowStatus = (row, status) => row.update({ status });

const buildCursorWhere = (cursor) => {
  if (!cursor) return {};
  return {
    [Op.or]: [
      { createdAt: { [Op.lt]: cursor.createdAt } },
      { createdAt: cursor.createdAt, id: { [Op.lt]: cursor.id } },
    ],
  };
};

export const findPendingIncomingRequests = async ({ followingId, cursor, limit }) => {
  const where = {
    followingId,
    status: 'pending',
    ...buildCursorWhere(cursor),
  };
  return Follow.findAll({
    where,
    include: [{ model: User, as: 'follower', attributes: publicAttrs }],
    order: [
      ['createdAt', 'DESC'],
      ['id', 'DESC'],
    ],
    limit: limit + 1,
  });
};

export const findFollowers = async ({ userId, cursor, limit }) => {
  const where = {
    followingId: userId,
    status: 'accepted',
    ...buildCursorWhere(cursor),
  };
  return Follow.findAll({
    where,
    include: [{ model: User, as: 'follower', attributes: publicAttrs }],
    order: [
      ['createdAt', 'DESC'],
      ['id', 'DESC'],
    ],
    limit: limit + 1,
  });
};

export const findFollowing = async ({ userId, cursor, limit }) => {
  const where = {
    followerId: userId,
    status: 'accepted',
    ...buildCursorWhere(cursor),
  };
  return Follow.findAll({
    where,
    include: [{ model: User, as: 'following', attributes: publicAttrs }],
    order: [
      ['createdAt', 'DESC'],
      ['id', 'DESC'],
    ],
    limit: limit + 1,
  });
};
