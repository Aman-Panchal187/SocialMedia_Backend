import { Op } from 'sequelize';
import db from '../../models/index.js';

const { Post, PostMedia, Hashtag, PostHashtag, Like, Comment, CommentLike, Save, Follow, User, sequelize } = db;

export const authorPublicAttrs = ['id', 'username', 'fullName', 'avatarUrl'];

export const createPostWithMedia = async ({ userId, type, caption, location, mediaItems, hashtagTags }, t) => {
  const post = await Post.create(
    { userId, type, caption, location },
    { transaction: t }
  );

  await PostMedia.bulkCreate(
    mediaItems.map((m, idx) => ({
      postId: post.id,
      mediaUrl: m.mediaUrl,
      publicId: m.publicId,
      mediaType: m.mediaType,
      position: idx,
      width: m.width || null,
      height: m.height || null,
      durationSec: m.durationSec || null,
    })),
    { transaction: t }
  );

  if (hashtagTags.length > 0) {
    const hashtagRows = await Promise.all(
      hashtagTags.map(async (tag) => {
        const [row] = await Hashtag.findOrCreate({ where: { tag }, transaction: t });
        return row;
      })
    );
    await PostHashtag.bulkCreate(
      hashtagRows.map((h) => ({ postId: post.id, hashtagId: h.id })),
      { transaction: t }
    );
  }

  return post;
};

export const findPostById = (postId) =>
  Post.findByPk(postId, {
    include: [
      { model: User, as: 'author', attributes: authorPublicAttrs },
      { model: PostMedia, as: 'media', separate: true, order: [['position', 'ASC']] },
      { model: Hashtag, as: 'hashtags', through: { attributes: [] } },
    ],
  });

export const updatePost = (post, attrs) => post.update(attrs);

export const softDeletePost = (post) => post.destroy();

export const findFollowingIds = async (userId) => {
  const rows = await Follow.findAll({
    where: { followerId: userId, status: 'accepted' },
    attributes: ['followingId'],
  });
  return rows.map((r) => r.followingId);
};

const buildCursorWhere = (cursor) => {
  if (!cursor) return {};
  return {
    [Op.or]: [
      { createdAt: { [Op.lt]: cursor.createdAt } },
      { createdAt: cursor.createdAt, id: { [Op.lt]: cursor.id } },
    ],
  };
};

export const findFeedPosts = async ({ authorIds, cursor, limit }) => {
  const where = {
    userId: { [Op.in]: authorIds },
    ...buildCursorWhere(cursor),
  };
  return Post.findAll({
    where,
    include: [
      { model: User, as: 'author', attributes: authorPublicAttrs },
      { model: PostMedia, as: 'media', separate: true, order: [['position', 'ASC']] },
    ],
    order: [
      ['createdAt', 'DESC'],
      ['id', 'DESC'],
    ],
    limit: limit + 1,
  });
};

export const findPostsByUserId = async ({ userId, cursor, limit }) => {
  const where = {
    userId,
    ...buildCursorWhere(cursor),
  };
  return Post.findAll({
    where,
    include: [{ model: PostMedia, as: 'media', separate: true, order: [['position', 'ASC']] }],
    order: [
      ['createdAt', 'DESC'],
      ['id', 'DESC'],
    ],
    limit: limit + 1,
  });
};

export const findLike = (userId, postId) => Like.findOne({ where: { userId, postId } });

export const findLikedPostIds = async (userId, postIds) => {
  if (!userId || postIds.length === 0) return new Set();
  const rows = await Like.findAll({ where: { userId, postId: { [Op.in]: postIds } }, attributes: ['postId'] });
  return new Set(rows.map((r) => r.postId));
};

export const findSavedPostIds = async (userId, postIds) => {
  if (!userId || postIds.length === 0) return new Set();
  const rows = await Save.findAll({ where: { userId, postId: { [Op.in]: postIds } }, attributes: ['postId'] });
  return new Set(rows.map((r) => r.postId));
};

export const findLikedCommentIds = async (userId, commentIds) => {
  if (!userId || commentIds.length === 0) return new Set();
  const rows = await CommentLike.findAll({
    where: { userId, commentId: { [Op.in]: commentIds } },
    attributes: ['commentId'],
  });
  return new Set(rows.map((r) => r.commentId));
};

export const createLike = (userId, postId, t) => Like.create({ userId, postId }, { transaction: t });

export const destroyLike = (likeRow, t) => likeRow.destroy({ transaction: t });

export const incrementPostLikeCount = (postId, delta, t) =>
  Post.increment('likeCount', { by: delta, where: { id: postId }, transaction: t });

export const findSave = (userId, postId) => Save.findOne({ where: { userId, postId } });

export const createSave = (userId, postId) => Save.create({ userId, postId });

export const destroySave = (saveRow) => saveRow.destroy();

export const findTopLevelComments = async ({ postId, cursor, limit }) => {
  const where = {
    postId,
    parentCommentId: null,
    ...buildCursorWhere(cursor),
  };
  return Comment.findAll({
    where,
    include: [{ model: User, as: 'author', attributes: authorPublicAttrs }],
    order: [
      ['createdAt', 'DESC'],
      ['id', 'DESC'],
    ],
    limit: limit + 1,
  });
};

export const countReplies = async (commentIds) => {
  if (commentIds.length === 0) return {};
  const rows = await Comment.findAll({
    where: { parentCommentId: { [Op.in]: commentIds } },
    attributes: ['parentCommentId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
    group: ['parentCommentId'],
    raw: true,
  });
  return rows.reduce((acc, row) => {
    acc[row.parentCommentId] = Number(row.count);
    return acc;
  }, {});
};

export const findReplies = async ({ commentId, cursor, limit }) => {
  const where = {
    parentCommentId: commentId,
    ...buildCursorWhere(cursor),
  };
  return Comment.findAll({
    where,
    include: [{ model: User, as: 'author', attributes: authorPublicAttrs }],
    order: [
      ['createdAt', 'DESC'],
      ['id', 'DESC'],
    ],
    limit: limit + 1,
  });
};

export const findCommentById = (commentId) => Comment.findByPk(commentId);

export const createComment = (attrs, t) => Comment.create(attrs, { transaction: t });

export const softDeleteComment = (comment, t) => comment.destroy({ transaction: t });

export const incrementPostCommentCount = (postId, delta, t) =>
  Post.increment('commentCount', { by: delta, where: { id: postId }, transaction: t });

export const findCommentLike = (userId, commentId) => CommentLike.findOne({ where: { userId, commentId } });

export const createCommentLike = (userId, commentId, t) =>
  CommentLike.create({ userId, commentId }, { transaction: t });

export const destroyCommentLike = (row, t) => row.destroy({ transaction: t });

export const incrementCommentLikeCount = (commentId, delta, t) =>
  Comment.increment('likeCount', { by: delta, where: { id: commentId }, transaction: t });

export { sequelize };
