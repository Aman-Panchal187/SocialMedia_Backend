import ApiError from '../../utils/ApiError.js';
import { uploadBufferToCloudinary, destroyCloudinaryAsset } from '../../config/cloudinary.js';
import { parseLimit, decodeCursor, buildPaginatedResponse } from '../../utils/paginationUtils.js';
import db from '../../models/index.js';
import * as storiesRepo from './stories.repository.js';
import * as usersRepo from '../users/users.repository.js';
import * as chatRepo from '../chat/chat.repository.js';
import { pushMessageEvent } from '../chat/chat.service.js';
import { notifyUser } from '../notifications/notifications.service.js';

const { StoryView } = db;

const STORY_TTL_MS = 24 * 60 * 60 * 1000;

const deriveMediaType = (mimetype) => (mimetype.startsWith('video/') ? 'video' : 'image');

const isStoryExpired = (story) => story.expiresAt.getTime() <= Date.now();

const assertStoryVisible = async (story, viewerId) => {
  if (!story || isStoryExpired(story)) throw ApiError.notFound('Story not found');

  const isOwner = viewerId === story.userId;
  if (isOwner) return;

  const author = story.author || (await usersRepo.findUserById(story.userId));
  if (!author?.isPrivate) return;

  if (!viewerId) throw ApiError.forbidden('This account is private');

  const followRow = await usersRepo.findFollowRow(viewerId, story.userId);
  if (!followRow || followRow.status !== 'accepted') {
    throw ApiError.forbidden('This account is private');
  }
};

const serializeStory = (story, viewedStoryIds) => ({
  id: story.id,
  mediaUrl: story.mediaUrl,
  mediaType: story.mediaType,
  caption: story.caption,
  viewCount: story.viewCount,
  createdAt: story.createdAt,
  expiresAt: story.expiresAt,
  viewed: viewedStoryIds ? viewedStoryIds.has(story.id) : false,
});

const serializeAuthor = (author) => ({
  id: author.id,
  username: author.username,
  avatarUrl: author.avatarUrl,
});

const fetchViewedStoryIdSet = async (storyIds, viewerId) => {
  if (!viewerId || storyIds.length === 0) return new Set();
  const rows = await StoryView.findAll({
    where: { storyId: storyIds, viewerId },
    attributes: ['storyId'],
  });
  return new Set(rows.map((r) => r.storyId));
};

const groupStoriesByAuthor = (stories, viewedStoryIds) => {
  const rings = new Map();
  for (const story of stories) {
    if (!rings.has(story.userId)) {
      rings.set(story.userId, { author: story.author, stories: [] });
    }
    rings.get(story.userId).stories.push(story);
  }

  const items = Array.from(rings.values()).map(({ author, stories: authorStories }) => {
    const serializedStories = authorStories.map((s) => serializeStory(s, viewedStoryIds));
    const hasUnviewed = serializedStories.some((s) => !s.viewed);
    const maxCreatedAt = Math.max(...authorStories.map((s) => new Date(s.createdAt).getTime()));
    return {
      author: author ? serializeAuthor(author) : undefined,
      hasUnviewed,
      stories: serializedStories,
      _maxCreatedAt: maxCreatedAt,
    };
  });

  items.sort((a, b) => {
    if (a.hasUnviewed !== b.hasUnviewed) return a.hasUnviewed ? -1 : 1;
    return b._maxCreatedAt - a._maxCreatedAt;
  });

  return items.map(({ _maxCreatedAt, ...rest }) => rest);
};

export const createStory = async (userId, { caption, file }) => {
  if (!file) throw ApiError.badRequest('A media file is required');

  const mediaType = deriveMediaType(file.mimetype);
  const result = await uploadBufferToCloudinary(file.buffer, {
    folder: 'instagram-clone/stories',
    resource_type: mediaType === 'video' ? 'video' : 'image',
  });

  const expiresAt = new Date(Date.now() + STORY_TTL_MS);

  const story = await storiesRepo.createStory({
    userId,
    caption: caption || null,
    mediaUrl: result.secure_url,
    publicId: result.public_id,
    mediaType,
    expiresAt,
  });

  const withAuthor = await storiesRepo.findStoryById(story.id);
  return serializeStory(withAuthor);
};

export const deleteStory = async (storyId, userId) => {
  const story = await storiesRepo.findStoryById(storyId);
  if (!story) throw ApiError.notFound('Story not found');
  if (story.userId !== userId) throw ApiError.forbidden('You do not own this story');

  await destroyCloudinaryAsset(story.publicId, {
    resource_type: story.mediaType === 'video' ? 'video' : 'image',
  });
  await storiesRepo.destroyStory(story);
};

export const getStoryFeed = async (userId) => {
  const followingIds = await storiesRepo.findFollowingIds(userId);
  const authorIds = Array.from(new Set([...followingIds, userId]));

  const stories = await storiesRepo.findActiveStoriesForAuthors(authorIds);
  const viewedStoryIds = await fetchViewedStoryIdSet(stories.map((s) => s.id), userId);

  return { items: groupStoriesByAuthor(stories, viewedStoryIds) };
};

export const getUserStories = async (username, viewerId) => {
  const targetUser = await usersRepo.findUserByUsername(username);
  if (!targetUser) throw ApiError.notFound('User not found');

  const isOwner = viewerId === targetUser.id;
  if (!isOwner && targetUser.isPrivate) {
    const followRow = viewerId ? await usersRepo.findFollowRow(viewerId, targetUser.id) : null;
    if (!followRow || followRow.status !== 'accepted') {
      throw ApiError.forbidden('This account is private');
    }
  }

  const stories = await storiesRepo.findActiveStoriesByUserId(targetUser.id);
  const viewedStoryIds = await fetchViewedStoryIdSet(stories.map((s) => s.id), viewerId);

  return {
    author: serializeAuthor(targetUser),
    items: stories.map((s) => serializeStory(s, viewedStoryIds)),
  };
};

export const viewStory = async (storyId, viewerId) => {
  const story = await storiesRepo.findStoryById(storyId);
  await assertStoryVisible(story, viewerId);

  const { created } = await storiesRepo.findOrCreateStoryView(storyId, viewerId);
  if (created) {
    await storiesRepo.incrementStoryViewCount(storyId);
  }
};

export const reactToStory = async (storyId, userId, emoji) => {
  const story = await storiesRepo.findStoryById(storyId);
  await assertStoryVisible(story, userId);

  await storiesRepo.upsertStoryReaction(storyId, userId, emoji);

  await notifyUser({
    recipientId: story.userId,
    actorId: userId,
    type: 'story_reaction',
    entityType: 'story',
    entityId: storyId,
  });
};

const serializeMessage = (message) => ({
  id: message.id,
  conversationId: message.conversationId,
  senderId: message.senderId,
  contentType: message.contentType,
  content: message.content,
  mediaUrl: message.mediaUrl,
  status: message.status,
  replyToStoryId: message.replyToStoryId,
  createdAt: message.createdAt,
});

export const replyToStory = async (storyId, userId, content) => {
  const story = await storiesRepo.findStoryById(storyId);
  await assertStoryVisible(story, userId);

  const mutual = await chatRepo.findMutualFollow(userId, story.userId);
  if (!mutual) throw ApiError.forbidden('Only mutual followers can reply to this story');

  let conversation = await chatRepo.findDirectConversationBetween(userId, story.userId);
  if (!conversation) {
    conversation = await chatRepo.createDirectConversation(userId, story.userId);
  }

  const message = await chatRepo.createMessage({
    conversationId: conversation.id,
    senderId: userId,
    contentType: 'text',
    content,
    replyToStoryId: storyId,
  });

  await chatRepo.touchConversation(conversation.id);

  const serialized = serializeMessage(message);

  await pushMessageEvent(story.userId, serialized);

  await notifyUser({
    recipientId: story.userId,
    actorId: userId,
    type: 'story_reply',
    entityType: 'story',
    entityId: storyId,
  });

  return serialized;
};

export const getStoryViewers = async (storyId, ownerId, { limit: rawLimit, cursor: rawCursor }) => {
  const story = await storiesRepo.findStoryById(storyId);
  if (!story) throw ApiError.notFound('Story not found');
  if (story.userId !== ownerId) throw ApiError.forbidden('Only the story owner can view this list');

  const limit = parseLimit(rawLimit);
  const cursor = decodeCursor(rawCursor);

  const rows = await storiesRepo.findStoryViewers({ storyId, cursor, limit });
  // Story views are ordered by viewedAt, not createdAt — keep the cursor consistent
  // with the sort field (see the same fix applied to chat.service.js's listConversations).
  const { items, nextCursor } = buildPaginatedResponse(rows, limit, (row) => row.viewedAt);

  return {
    items: items.map((row) => ({
      viewedAt: row.viewedAt,
      viewer: row.viewer ? serializeAuthor(row.viewer) : undefined,
    })),
    nextCursor,
  };
};
