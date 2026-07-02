import { Op } from 'sequelize';
import db from '../../models/index.js';

const { Story, StoryView, StoryReaction, Follow, User } = db;

export const authorPublicAttrs = ['id', 'username', 'avatarUrl'];

export const findFollowingIds = async (userId) => {
  const rows = await Follow.findAll({
    where: { followerId: userId, status: 'accepted' },
    attributes: ['followingId'],
  });
  return rows.map((r) => r.followingId);
};

export const createStory = ({ userId, caption, mediaUrl, publicId, mediaType, expiresAt }) =>
  Story.create({ userId, caption: caption ?? null, mediaUrl, publicId, mediaType, expiresAt });

export const findStoryById = (storyId) =>
  Story.findByPk(storyId, {
    include: [{ model: User, as: 'author', attributes: authorPublicAttrs }],
  });

export const destroyStory = (storyRow) => storyRow.destroy();

export const findActiveStoriesForAuthors = (authorIds) =>
  Story.findAll({
    where: { userId: { [Op.in]: authorIds }, expiresAt: { [Op.gt]: new Date() } },
    include: [{ model: User, as: 'author', attributes: authorPublicAttrs }],
    order: [
      ['userId', 'ASC'],
      ['createdAt', 'ASC'],
    ],
  });

export const findActiveStoriesByUserId = (userId) =>
  Story.findAll({
    where: { userId, expiresAt: { [Op.gt]: new Date() } },
    include: [{ model: User, as: 'author', attributes: authorPublicAttrs }],
    order: [['createdAt', 'ASC']],
  });

export const findStoryViewByPair = (storyId, viewerId) =>
  StoryView.findOne({ where: { storyId, viewerId } });

export const createStoryView = (storyId, viewerId) => StoryView.create({ storyId, viewerId });

export const findOrCreateStoryView = async (storyId, viewerId) => {
  const [view, created] = await StoryView.findOrCreate({
    where: { storyId, viewerId },
    defaults: { storyId, viewerId },
  });
  return { view, created };
};

export const incrementStoryViewCount = (storyId) =>
  Story.increment('viewCount', { where: { id: storyId } });

export const findStoryReaction = (storyId, userId) =>
  StoryReaction.findOne({ where: { storyId, userId } });

export const upsertStoryReaction = async (storyId, userId, emoji) => {
  const existing = await findStoryReaction(storyId, userId);
  if (existing) {
    return existing.update({ reactionEmoji: emoji });
  }
  return StoryReaction.create({ storyId, userId, reactionEmoji: emoji });
};

const buildCursorWhere = (cursor) => {
  if (!cursor) return {};
  return {
    [Op.or]: [
      { viewedAt: { [Op.lt]: cursor.createdAt } },
      { viewedAt: cursor.createdAt, id: { [Op.lt]: cursor.id } },
    ],
  };
};

export const findStoryViewers = async ({ storyId, cursor, limit }) => {
  const where = {
    storyId,
    ...buildCursorWhere(cursor),
  };
  return StoryView.findAll({
    where,
    include: [{ model: User, as: 'viewer', attributes: authorPublicAttrs }],
    order: [
      ['viewedAt', 'DESC'],
      ['id', 'DESC'],
    ],
    limit: limit + 1,
  });
};

export const findExpiredStories = (limit) =>
  Story.findAll({
    where: { expiresAt: { [Op.lte]: new Date() } },
    limit,
  });
