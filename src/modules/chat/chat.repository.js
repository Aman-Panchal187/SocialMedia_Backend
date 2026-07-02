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

// Small race window: if both users start a conversation with each other at the
// exact same moment, this lookup can miss the other's in-flight insert and both
// requests create a Conversation row. No uniqueness constraint exists on the
// schema to prevent this (accepted trade-off at this scale, per the plan).
export const findDirectConversationBetween = async (userIdA, userIdB) => {
  const [rowsA, rowsB] = await Promise.all([
    ConversationParticipant.findAll({
      where: { userId: userIdA },
      include: [{ model: Conversation, where: { isGroup: false }, required: true }],
    }),
    ConversationParticipant.findAll({
      where: { userId: userIdB },
      include: [{ model: Conversation, where: { isGroup: false }, required: true }],
    }),
  ]);

  const conversationIdsA = new Set(rowsA.map((row) => row.conversationId));
  const match = rowsB.find((row) => conversationIdsA.has(row.conversationId));
  if (!match) return null;

  return Conversation.findByPk(match.conversationId);
};

export const createDirectConversation = (userIdA, userIdB) =>
  db.sequelize.transaction(async (t) => {
    const conversation = await Conversation.create({ isGroup: false }, { transaction: t });
    await ConversationParticipant.bulkCreate(
      [
        { conversationId: conversation.id, userId: userIdA },
        { conversationId: conversation.id, userId: userIdB },
      ],
      { transaction: t }
    );
    return conversation;
  });

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

  const where = {
    id: { [Op.in]: conversationIds },
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
