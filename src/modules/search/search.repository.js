import { Op } from 'sequelize';
import db from '../../models/index.js';
import { findUserById } from '../users/users.repository.js';

const { User, Follow, SearchHistory } = db;

export const publicAttrs = ['id', 'username', 'fullName', 'avatarUrl', 'isPrivate'];

export const findByUsernamePrefix = (term, excludeUserId, limit) =>
  User.findAll({
    where: {
      username: { [Op.iLike]: `${term}%` },
      id: { [Op.ne]: excludeUserId },
      isActive: true,
    },
    attributes: publicAttrs,
    limit,
  });

export const findByFullNamePrefix = (term, excludeUserId, limit) =>
  User.findAll({
    where: {
      fullName: { [Op.iLike]: `${term}%` },
      id: { [Op.ne]: excludeUserId },
      isActive: true,
    },
    attributes: publicAttrs,
    limit,
  });

export const findByContains = (term, excludeUserId, excludeIds, limit) =>
  User.findAll({
    where: {
      [Op.or]: [{ username: { [Op.iLike]: `%${term}%` } }, { fullName: { [Op.iLike]: `%${term}%` } }],
      id: { [Op.notIn]: [excludeUserId, ...excludeIds] },
      isActive: true,
    },
    attributes: publicAttrs,
    limit,
  });

export const findFollowStatusMap = async (userId, candidateIds) => {
  if (candidateIds.length === 0) return new Map();
  const rows = await Follow.findAll({
    where: { followerId: userId, followingId: { [Op.in]: candidateIds } },
  });
  return new Map(rows.map((row) => [row.followingId, row.status]));
};

export const upsertSearchRecord = (userId, searchedUserId) =>
  SearchHistory.upsert({ userId, searchedUserId });

export const findRecentSearches = (userId, limit) =>
  SearchHistory.findAll({
    where: { userId },
    order: [['updatedAt', 'DESC']],
    limit,
    include: [{ model: User, as: 'searchedUser', attributes: publicAttrs }],
  });

export const destroyRecentSearch = (userId, searchedUserId) =>
  SearchHistory.destroy({ where: { userId, searchedUserId } });

export const destroyAllRecentSearches = (userId) => SearchHistory.destroy({ where: { userId } });

export { findUserById };
