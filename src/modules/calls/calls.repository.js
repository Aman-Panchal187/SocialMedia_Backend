import { Op } from 'sequelize';
import db from '../../models/index.js';

const { Call, User } = db;

export const participantAttrs = ['id', 'username', 'fullName', 'avatarUrl'];

export const createCallRecord = ({ callerId, calleeId, callType, status, startedAt, endedAt, durationSec }) =>
  Call.create({
    callerId,
    calleeId,
    callType,
    status,
    startedAt: startedAt ?? null,
    endedAt: endedAt ?? null,
    durationSec: durationSec ?? null,
  });

const buildCursorWhere = (cursor) => {
  if (!cursor) return {};
  return {
    [Op.or]: [
      { createdAt: { [Op.lt]: cursor.createdAt } },
      { createdAt: cursor.createdAt, id: { [Op.lt]: cursor.id } },
    ],
  };
};

export const findCallHistoryForUser = async ({ userId, cursor, limit }) => {
  const where = {
    [Op.or]: [{ callerId: userId }, { calleeId: userId }],
    ...buildCursorWhere(cursor),
  };

  return Call.findAll({
    where,
    include: [
      { model: User, as: 'caller', attributes: participantAttrs },
      { model: User, as: 'callee', attributes: participantAttrs },
    ],
    order: [
      ['createdAt', 'DESC'],
      ['id', 'DESC'],
    ],
    limit: limit + 1,
  });
};
