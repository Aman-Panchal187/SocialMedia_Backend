import { Op } from 'sequelize';
import db from '../../models/index.js';

const { Conversation, ConversationParticipant, Message, Follow, User } = db;

export const participantUserAttrs = ['id', 'username', 'fullName', 'avatarUrl', 'lastSeenAt'];

export const findUserByUsername = (username) => User.findOne({ where: { username } });

export const findMutualFollow = async (userIdA, userIdB) => {
  const [aFollowsB, bFollowsA] = await Promise.all([
    Follow.findOne({ where: { followerId: userIdA, followingId: userIdB, status: 'accepted' } }),
    Follow.findOne({ where: { followerId: userIdB, followingId: userIdA, status: 'accepted' } }),
  ]);
  return Boolean(aFollowsB && bFollowsA);
};

const buildDirectKey = (userIdA, userIdB) => [userIdA, userIdB].sort().join(':');

export const findDirectConversationBetween = (userIdA, userIdB) =>
  Conversation.findOne({ where: { directKey: buildDirectKey(userIdA, userIdB) } });

// Race-safe: a unique index on conversations.direct_key is the actual guard
// against duplicate direct conversations. If two users both call this at the
// same moment, one insert wins and the other hits a unique violation here,
// which we treat as "already exists" and just look it up.
export const createDirectConversation = async (userIdA, userIdB) => {
  const directKey = buildDirectKey(userIdA, userIdB);
  try {
    return await db.sequelize.transaction(async (t) => {
      const conversation = await Conversation.create({ isGroup: false, directKey }, { transaction: t });
      await ConversationParticipant.bulkCreate(
        [
          { conversationId: conversation.id, userId: userIdA },
          { conversationId: conversation.id, userId: userIdB },
        ],
        { transaction: t }
      );
      return conversation;
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      const existing = await Conversation.findOne({ where: { directKey } });
      if (existing) return existing;
    }
    throw err;
  }
};

export const touchConversation = (conversationId) =>
  Conversation.update({ updatedAt: new Date() }, { where: { id: conversationId } });

const buildCursorWhere = (cursor) => {
  if (!cursor) return {};
  return {
    [Op.or]: [
      { updatedAt: { [Op.lt]: cursor.createdAt } },
      { updatedAt: cursor.createdAt, id: { [Op.lt]: cursor.id } },
    ],
  };
};

export const findConversationsForUser = async ({ userId, cursor, limit }) => {
  const participantRows = await ConversationParticipant.findAll({ where: { userId } });
  const conversationIds = participantRows.map((row) => row.conversationId);
  if (conversationIds.length === 0) return [];

  // A conversation is only "real" to either participant once a message has
  // actually been sent — visiting a mutual follower's profile and opening the
  // chat page shouldn't make an empty thread appear in their inbox.
  const messagedRows = await Message.findAll({
    where: { conversationId: { [Op.in]: conversationIds } },
    attributes: ['conversationId'],
    group: ['conversationId'],
  });
  const conversationIdsWithMessages = messagedRows.map((row) => row.conversationId);
  if (conversationIdsWithMessages.length === 0) return [];

  const where = {
    id: { [Op.in]: conversationIdsWithMessages },
    ...buildCursorWhere(cursor),
  };

  return Conversation.findAll({
    where,
    include: [
      {
        model: ConversationParticipant,
        include: [{ model: User, attributes: participantUserAttrs }],
      },
    ],
    order: [
      ['updatedAt', 'DESC'],
      ['id', 'DESC'],
    ],
    limit: limit + 1,
  });
};

export const findOtherParticipant = (conversationId, userId) =>
  ConversationParticipant.findOne({
    where: { conversationId, userId: { [Op.ne]: userId } },
  });

export const findAllConversationPartnerIds = async (userId) => {
  const ownRows = await ConversationParticipant.findAll({ where: { userId } });
  const conversationIds = ownRows.map((row) => row.conversationId);
  if (conversationIds.length === 0) return [];

  const otherRows = await ConversationParticipant.findAll({
    where: { conversationId: { [Op.in]: conversationIds }, userId: { [Op.ne]: userId } },
  });
  return Array.from(new Set(otherRows.map((row) => row.userId)));
};

export const findLastMessage = (conversationId) =>
  Message.findOne({ where: { conversationId }, order: [['createdAt', 'DESC']] });

export const countUnreadInConversation = (conversationId, userId) =>
  Message.count({ where: { conversationId, senderId: { [Op.ne]: userId }, status: 'sent' } });

export const countUnreadTotal = async (userId) => {
  const participantRows = await ConversationParticipant.findAll({ where: { userId } });
  const conversationIds = participantRows.map((row) => row.conversationId);
  if (conversationIds.length === 0) return 0;

  return Message.count({
    where: { conversationId: { [Op.in]: conversationIds }, senderId: { [Op.ne]: userId }, status: 'sent' },
  });
};

const buildMessageCursorWhere = (cursor) => {
  if (!cursor) return {};
  return {
    [Op.or]: [
      { createdAt: { [Op.lt]: cursor.createdAt } },
      { createdAt: cursor.createdAt, id: { [Op.lt]: cursor.id } },
    ],
  };
};

export const findMessages = async ({ conversationId, cursor, limit }) => {
  const where = {
    conversationId,
    ...buildMessageCursorWhere(cursor),
  };
  return Message.findAll({
    where,
    order: [
      ['createdAt', 'DESC'],
      ['id', 'DESC'],
    ],
    limit: limit + 1,
  });
};

export const createMessage = ({ conversationId, senderId, contentType, content, mediaUrl, publicId, replyToStoryId }) =>
  Message.create({
    conversationId,
    senderId,
    contentType,
    content: content ?? null,
    mediaUrl: mediaUrl ?? null,
    publicId: publicId ?? null,
    replyToStoryId: replyToStoryId ?? null,
  });

export const markConversationRead = async (conversationId, readerId) => {
  await Message.update(
    { status: 'read' },
    { where: { conversationId, senderId: { [Op.ne]: readerId }, status: 'sent' } }
  );

  const latest = await Message.findOne({ where: { conversationId }, order: [['createdAt', 'DESC']] });
  if (latest) {
    await ConversationParticipant.update(
      { lastReadMessageId: latest.id },
      { where: { conversationId, userId: readerId } }
    );
  }
};

export const isParticipant = async (conversationId, userId) => {
  const row = await ConversationParticipant.findOne({ where: { conversationId, userId } });
  return Boolean(row);
};
