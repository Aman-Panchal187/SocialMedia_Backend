import { Op } from 'sequelize';
import db from '../../models/index.js';

const { User, Post, Follow, sequelize } = db;

export const findUserByUsername = (username) => User.findOne({ where: { username } });

export const findUserById = (id) => User.findByPk(id);

export const findUserByUsernameExcludingId = (username, excludeId) =>
  User.findOne({ where: { username, id: { [Op.ne]: excludeId } } });

export const countPostsByUser = (userId) => Post.count({ where: { userId } });

export const countFollowers = (userId) => Follow.count({ where: { followingId: userId, status: 'accepted' } });

export const countFollowing = (userId) => Follow.count({ where: { followerId: userId, status: 'accepted' } });

export const findFollowRow = (followerId, followingId) =>
  Follow.findOne({ where: { followerId, followingId } });

export const updateUser = (user, attrs) => user.update(attrs);

export const getProfileCounts = async (userId) => {
  const [postCount, followerCount, followingCount] = await Promise.all([
    countPostsByUser(userId),
    countFollowers(userId),
    countFollowing(userId),
  ]);
  return { postCount, followerCount, followingCount };
};

export { sequelize };
