import ApiError from '../../utils/ApiError.js';
import { uploadBufferToCloudinary } from '../../config/cloudinary.js';
import { parseLimit, decodeCursor, buildPaginatedResponse } from '../../utils/paginationUtils.js';
import db from '../../models/index.js';
import * as postsRepo from './posts.repository.js';
import * as usersRepo from '../users/users.repository.js';
import { notifyUser } from '../notifications/notifications.service.js';

const HASHTAG_PATTERN = /#([a-zA-Z0-9_]{1,50})/g;

const extractHashtagsFromCaption = (caption = '') => {
  const matches = [...caption.matchAll(HASHTAG_PATTERN)].map((m) => m[1].toLowerCase());
  return matches;
};

const normalizeHashtagInput = (hashtags) => {
  if (!hashtags) return [];
  const list = Array.isArray(hashtags) ? hashtags : [hashtags];
  return list.map((h) => h.replace(/^#/, '').toLowerCase()).filter(Boolean);
};

const deriveMediaType = (mimetype) => (mimetype.startsWith('video/') ? 'video' : 'image');

const derivePostType = (mediaTypes) => {
  const uniqueTypes = new Set(mediaTypes);
  if (uniqueTypes.size > 1) {
    throw ApiError.badRequest('A post cannot mix images and videos');
  }
  if (mediaTypes.length > 1) return 'carousel';
  return mediaTypes[0];
};

export const createPost = async ({ userId, caption, hashtags, location, files }) => {
  if (!files || files.length === 0) {
    throw ApiError.badRequest('At least one media file is required');
  }

  const mediaTypes = files.map((f) => deriveMediaType(f.mimetype));
  const type = derivePostType(mediaTypes);

  const uploadResults = await Promise.all(
    files.map((file, idx) =>
      uploadBufferToCloudinary(file.buffer, {
        folder: 'photosphere/posts',
        resource_type: mediaTypes[idx] === 'video' ? 'video' : 'image',
      })
    )
  );

  const mediaItems = uploadResults.map((result, idx) => ({
    mediaUrl: result.secure_url,
    publicId: result.public_id,
    mediaType: mediaTypes[idx],
    width: result.width || null,
    height: result.height || null,
    durationSec: result.duration ? Math.round(result.duration) : null,
  }));

  const mergedHashtags = Array.from(
    new Set([...extractHashtagsFromCaption(caption), ...normalizeHashtagInput(hashtags)])
  );

  const post = await db.sequelize.transaction(async (t) => {
    const created = await postsRepo.createPostWithMedia(
      { userId, type, caption: caption || null, location: location || null, mediaItems, hashtagTags: mergedHashtags },
      t
    );
    return created;
  });

  return postsRepo.findPostById(post.id);
};

const assertPostVisible = async (post, viewerId) => {
  if (!post) throw ApiError.notFound('Post not found');

  const isOwner = viewerId === post.userId;
  if (isOwner) return;

  const author = post.author || (await usersRepo.findUserById(post.userId));
  if (!author?.isPrivate) return;

  if (!viewerId) throw ApiError.forbidden('This account is private');

  const followRow = await usersRepo.findFollowRow(viewerId, post.userId);
  if (!followRow || followRow.status !== 'accepted') {
    throw ApiError.forbidden('This account is private');
  }
};

const serializePost = (post) => ({
  id: post.id,
  type: post.type,
  caption: post.caption,
  location: post.location,
  likeCount: post.likeCount,
  commentCount: post.commentCount,
  isCommentsDisabled: post.isCommentsDisabled,
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
  author: post.author
    ? {
        id: post.author.id,
        username: post.author.username,
        fullName: post.author.fullName,
        avatarUrl: post.author.avatarUrl,
      }
    : undefined,
  media: (post.media || []).map((m) => ({
    id: m.id,
    mediaUrl: m.mediaUrl,
    mediaType: m.mediaType,
    position: m.position,
    width: m.width,
    height: m.height,
    durationSec: m.durationSec,
  })),
  hashtags: (post.hashtags || []).map((h) => h.tag),
});

export const getPostById = async (postId, viewerId) => {
  const post = await postsRepo.findPostById(postId);
  await assertPostVisible(post, viewerId);
  return serializePost(post);
};

export const deletePost = async (postId, userId) => {
  const post = await postsRepo.findPostById(postId);
  if (!post) throw ApiError.notFound('Post not found');
  if (post.userId !== userId) throw ApiError.forbidden('You do not own this post');
  await postsRepo.softDeletePost(post);
};

export const updatePostCaption = async (postId, userId, caption) => {
  const post = await postsRepo.findPostById(postId);
  if (!post) throw ApiError.notFound('Post not found');
  if (post.userId !== userId) throw ApiError.forbidden('You do not own this post');
  await postsRepo.updatePost(post, { caption });
  return serializePost(await postsRepo.findPostById(postId));
};

export const getFeed = async (userId, { limit: rawLimit, cursor: rawCursor }) => {
  const limit = parseLimit(rawLimit);
  const cursor = decodeCursor(rawCursor);

  const followingIds = await postsRepo.findFollowingIds(userId);
  const authorIds = Array.from(new Set([...followingIds, userId]));

  const rows = await postsRepo.findFeedPosts({ authorIds, cursor, limit });
  const { items, nextCursor } = buildPaginatedResponse(rows, limit);
  return { items: items.map(serializePost), nextCursor };
};

export const getPostsByUsername = async (username, viewerId, { limit: rawLimit, cursor: rawCursor }) => {
  const limit = parseLimit(rawLimit);
  const cursor = decodeCursor(rawCursor);

  const targetUser = await usersRepo.findUserByUsername(username);
  if (!targetUser) throw ApiError.notFound('User not found');

  const isOwner = viewerId === targetUser.id;
  if (!isOwner && targetUser.isPrivate) {
    const followRow = viewerId ? await usersRepo.findFollowRow(viewerId, targetUser.id) : null;
    if (!followRow || followRow.status !== 'accepted') {
      throw ApiError.forbidden('This account is private');
    }
  }

  const rows = await postsRepo.findPostsByUserId({ userId: targetUser.id, cursor, limit });
  const { items, nextCursor } = buildPaginatedResponse(rows, limit);
  return { items: items.map(serializePost), nextCursor };
};

export const likePost = async (postId, userId) => {
  const post = await postsRepo.findPostById(postId);
  await assertPostVisible(post, userId);

  const existing = await postsRepo.findLike(userId, postId);
  if (existing) throw ApiError.conflict('Post already liked');

  await db.sequelize.transaction(async (t) => {
    await postsRepo.createLike(userId, postId, t);
    await postsRepo.incrementPostLikeCount(postId, 1, t);
  });

  await notifyUser({ recipientId: post.userId, actorId: userId, type: 'like', entityType: 'post', entityId: postId });
};

export const unlikePost = async (postId, userId) => {
  const existing = await postsRepo.findLike(userId, postId);
  if (!existing) throw ApiError.notFound('Like not found');

  await db.sequelize.transaction(async (t) => {
    await postsRepo.destroyLike(existing, t);
    await postsRepo.incrementPostLikeCount(postId, -1, t);
  });
};

export const savePost = async (postId, userId) => {
  const post = await postsRepo.findPostById(postId);
  await assertPostVisible(post, userId);

  const existing = await postsRepo.findSave(userId, postId);
  if (existing) throw ApiError.conflict('Post already saved');

  await postsRepo.createSave(userId, postId);
};

export const unsavePost = async (postId, userId) => {
  const existing = await postsRepo.findSave(userId, postId);
  if (!existing) throw ApiError.notFound('Save not found');
  await postsRepo.destroySave(existing);
};

const serializeComment = (comment, replyCount = 0) => ({
  id: comment.id,
  postId: comment.postId,
  parentCommentId: comment.parentCommentId,
  content: comment.content,
  likeCount: comment.likeCount,
  createdAt: comment.createdAt,
  author: comment.author
    ? {
        id: comment.author.id,
        username: comment.author.username,
        fullName: comment.author.fullName,
        avatarUrl: comment.author.avatarUrl,
      }
    : undefined,
  replyCount,
});

export const getComments = async (postId, viewerId, { limit: rawLimit, cursor: rawCursor }) => {
  const post = await postsRepo.findPostById(postId);
  await assertPostVisible(post, viewerId);

  const limit = parseLimit(rawLimit);
  const cursor = decodeCursor(rawCursor);

  const rows = await postsRepo.findTopLevelComments({ postId, cursor, limit });
  const { items, nextCursor } = buildPaginatedResponse(rows, limit);

  const replyCounts = await postsRepo.countReplies(items.map((c) => c.id));
  return { items: items.map((c) => serializeComment(c, replyCounts[c.id] || 0)), nextCursor };
};

export const getReplies = async (commentId, { limit: rawLimit, cursor: rawCursor }) => {
  const parent = await postsRepo.findCommentById(commentId);
  if (!parent) throw ApiError.notFound('Comment not found');

  const limit = parseLimit(rawLimit);
  const cursor = decodeCursor(rawCursor);

  const rows = await postsRepo.findReplies({ commentId, cursor, limit });
  const { items, nextCursor } = buildPaginatedResponse(rows, limit);
  return { items: items.map((c) => serializeComment(c, 0)), nextCursor };
};

export const createComment = async (postId, userId, { content, parentCommentId }) => {
  const post = await postsRepo.findPostById(postId);
  await assertPostVisible(post, userId);

  if (post.isCommentsDisabled) throw ApiError.forbidden('Comments are disabled on this post');

  let parent;
  if (parentCommentId) {
    parent = await postsRepo.findCommentById(parentCommentId);
    if (!parent || parent.postId !== postId) throw ApiError.notFound('Parent comment not found');
    // Only one level of nesting is allowed (matches Instagram's flat-reply UX),
    // so a reply's parent must itself be a top-level comment.
    if (parent.parentCommentId) {
      throw ApiError.badRequest('Cannot reply to a reply — only one level of nesting is allowed');
    }
  }

  const comment = await db.sequelize.transaction(async (t) => {
    const created = await postsRepo.createComment(
      { postId, userId, parentCommentId: parentCommentId || null, content },
      t
    );
    await postsRepo.incrementPostCommentCount(postId, 1, t);
    return created;
  });

  if (parent) {
    await notifyUser({ recipientId: parent.userId, actorId: userId, type: 'reply', entityType: 'post', entityId: postId });
  } else {
    await notifyUser({ recipientId: post.userId, actorId: userId, type: 'comment', entityType: 'post', entityId: postId });
  }

  const withAuthor = await postsRepo.findCommentById(comment.id);
  const author = await usersRepo.findUserById(userId);
  withAuthor.author = author;
  return serializeComment(withAuthor, 0);
};

export const deleteComment = async (commentId, userId) => {
  const comment = await postsRepo.findCommentById(commentId);
  if (!comment) throw ApiError.notFound('Comment not found');

  const post = await postsRepo.findPostById(comment.postId);
  const isCommentOwner = comment.userId === userId;
  const isPostOwner = post && post.userId === userId;

  if (!isCommentOwner && !isPostOwner) {
    throw ApiError.forbidden('You cannot delete this comment');
  }

  await db.sequelize.transaction(async (t) => {
    await postsRepo.softDeleteComment(comment, t);
    await postsRepo.incrementPostCommentCount(comment.postId, -1, t);
  });
};

export const likeComment = async (commentId, userId) => {
  const comment = await postsRepo.findCommentById(commentId);
  if (!comment) throw ApiError.notFound('Comment not found');

  const existing = await postsRepo.findCommentLike(userId, commentId);
  if (existing) throw ApiError.conflict('Comment already liked');

  await db.sequelize.transaction(async (t) => {
    await postsRepo.createCommentLike(userId, commentId, t);
    await postsRepo.incrementCommentLikeCount(commentId, 1, t);
  });
};

export const unlikeComment = async (commentId, userId) => {
  const existing = await postsRepo.findCommentLike(userId, commentId);
  if (!existing) throw ApiError.notFound('Like not found');

  await db.sequelize.transaction(async (t) => {
    await postsRepo.destroyCommentLike(existing, t);
    await postsRepo.incrementCommentLikeCount(commentId, -1, t);
  });
};
