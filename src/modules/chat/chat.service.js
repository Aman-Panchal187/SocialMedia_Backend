import ApiError from '../../utils/ApiError.js';
import { uploadBufferToCloudinary } from '../../config/cloudinary.js';
import { parseLimit, decodeCursor, buildPaginatedResponse } from '../../utils/paginationUtils.js';
import { getIO } from '../../config/socket.js';
import logger from '../../config/logger.js';
import { isUserOnline } from '../../sockets/presence.socket.js';
import * as chatRepo from './chat.repository.js';

const CONTENT_TYPE_TO_RESOURCE_TYPE = {
  image: 'image',
  video: 'video',
  file: 'raw',
};

const serializeMessage = (message) => ({
  id: message.id,
  conversationId: message.conversationId,
  senderId: message.senderId,
  contentType: message.contentType,
  content: message.content,
  mediaUrl: message.mediaUrl,
  status: message.status,
  createdAt: message.createdAt,
});

const serializeOtherUser = (user) => ({
  id: user.id,
  username: user.username,
  fullName: user.fullName,
  avatarUrl: user.avatarUrl,
  isOnline: isUserOnline(user.id),
  lastSeenAt: user.lastSeenAt,
});

const resolveOtherUser = async (conversation, userId) => {
  const participants = conversation.ConversationParticipants || [];
  const otherParticipant = participants.find((p) => p.userId !== userId);
  return otherParticipant?.User || null;
};

const serializeConversation = async (conversation, userId) => {
  const otherUser = await resolveOtherUser(conversation, userId);
  const [lastMessage, unreadCount] = await Promise.all([
    chatRepo.findLastMessage(conversation.id),
    chatRepo.countUnreadInConversation(conversation.id, userId),
  ]);

  return {
    id: conversation.id,
    otherUser: otherUser ? serializeOtherUser(otherUser) : null,
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          contentType: lastMessage.contentType,
          content: lastMessage.content,
          mediaUrl: lastMessage.mediaUrl,
          senderId: lastMessage.senderId,
          createdAt: lastMessage.createdAt,
        }
      : null,
    unreadCount,
    updatedAt: conversation.updatedAt,
  };
};

export const startConversation = async (currentUserId, targetUsername) => {
  const target = await chatRepo.findUserByUsername(targetUsername);
  if (!target) throw ApiError.notFound('User not found');
  if (target.id === currentUserId) throw ApiError.badRequest('You cannot message yourself');

  const mutual = await chatRepo.findMutualFollow(currentUserId, target.id);
  if (!mutual) throw ApiError.forbidden('You can only message mutual followers');

  let conversation = await chatRepo.findDirectConversationBetween(currentUserId, target.id);
  if (!conversation) {
    conversation = await chatRepo.createDirectConversation(currentUserId, target.id);
  }

  return {
    id: conversation.id,
    otherUser: serializeOtherUser(target),
    lastMessage: null,
    unreadCount: 0,
    updatedAt: conversation.updatedAt,
  };
};

export const listConversations = async (userId, { limit: rawLimit, cursor: rawCursor }) => {
  const limit = parseLimit(rawLimit);
  const cursor = decodeCursor(rawCursor);

  const rows = await chatRepo.findConversationsForUser({ userId, cursor, limit });
  // Conversations are ordered by updatedAt (most recent activity), not createdAt,
  // so the cursor must be built from the same field the query is sorted/filtered on.
  const { items, nextCursor } = buildPaginatedResponse(rows, limit, (row) => row.updatedAt);

  const serialized = await Promise.all(items.map((row) => serializeConversation(row, userId)));
  return { items: serialized, nextCursor };
};

export const getMessages = async (conversationId, userId, { limit: rawLimit, cursor: rawCursor }) => {
  const participant = await chatRepo.isParticipant(conversationId, userId);
  if (!participant) throw ApiError.forbidden('You are not a participant in this conversation');

  const limit = parseLimit(rawLimit);
  const cursor = decodeCursor(rawCursor);

  const rows = await chatRepo.findMessages({ conversationId, cursor, limit });
  const { items, nextCursor } = buildPaginatedResponse(rows, limit);

  return { items: items.map(serializeMessage), nextCursor };
};

export const pushMessageEvent = async (recipientId, serializedMessage) => {
  try {
    getIO().to(`user:${recipientId}`).emit('chat:message', serializedMessage);
    const count = await chatRepo.countUnreadTotal(recipientId);
    getIO().to(`user:${recipientId}`).emit('chat:unread-count', { count });
  } catch (err) {
    logger.error(`Failed to emit realtime chat message to user:${recipientId}: ${err.message}`);
  }
};

export const sendMessage = async (conversationId, userId, { contentType, content, file }) => {
  const participant = await chatRepo.isParticipant(conversationId, userId);
  if (!participant) throw ApiError.forbidden('You are not a participant in this conversation');

  let mediaUrl = null;
  let publicId = null;
  let persistedContent = null;

  if (contentType === 'text') {
    if (!content || !content.trim()) throw ApiError.badRequest('Message content is required for text messages');
    persistedContent = content;
  } else {
    if (!file) throw ApiError.badRequest('An attachment file is required for this message type');
    const result = await uploadBufferToCloudinary(file.buffer, {
      folder: 'instagram-clone/chat',
      resource_type: CONTENT_TYPE_TO_RESOURCE_TYPE[contentType],
    });
    mediaUrl = result.secure_url;
    publicId = result.public_id;
  }

  const message = await chatRepo.createMessage({
    conversationId,
    senderId: userId,
    contentType,
    content: persistedContent,
    mediaUrl,
    publicId,
  });

  await chatRepo.touchConversation(conversationId);

  const serialized = serializeMessage(message);

  const otherParticipant = await chatRepo.findOtherParticipant(conversationId, userId);
  if (otherParticipant) {
    await pushMessageEvent(otherParticipant.userId, serialized);
  }

  return serialized;
};

export const markRead = async (conversationId, userId) => {
  const participant = await chatRepo.isParticipant(conversationId, userId);
  if (!participant) throw ApiError.forbidden('You are not a participant in this conversation');

  await chatRepo.markConversationRead(conversationId, userId);

  const otherParticipant = await chatRepo.findOtherParticipant(conversationId, userId);
  if (otherParticipant) {
    try {
      getIO()
        .to(`user:${otherParticipant.userId}`)
        .emit('chat:read', { conversationId, readAt: new Date().toISOString() });
    } catch (err) {
      logger.error(`Failed to emit chat:read to user:${otherParticipant.userId}: ${err.message}`);
    }
  }
};

export const getUnreadCount = async (userId) => {
  const count = await chatRepo.countUnreadTotal(userId);
  return { count };
};
