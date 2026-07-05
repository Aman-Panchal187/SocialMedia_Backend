import env from '../../config/env.js';
import { parseLimit, decodeCursor, buildPaginatedResponse } from '../../utils/paginationUtils.js';
import * as callsRepo from './calls.repository.js';

const serializeParticipant = (user) => ({
  id: user.id,
  username: user.username,
  fullName: user.fullName,
  avatarUrl: user.avatarUrl,
});

const serializeCall = (row, userId) => {
  const isOutgoing = row.callerId === userId;
  return {
    id: row.id,
    otherUser: serializeParticipant(isOutgoing ? row.callee : row.caller),
    direction: isOutgoing ? 'outgoing' : 'incoming',
    callType: row.callType,
    status: row.status,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    durationSec: row.durationSec,
    createdAt: row.createdAt,
  };
};

// Served from the backend (rather than hardcoded in the frontend bundle) so
// the TURN provider/credentials can be rotated with an env-var change alone.
export const getIceServers = () => {
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  if (env.turn.urls.length > 0 && env.turn.username && env.turn.credential) {
    for (const url of env.turn.urls) {
      iceServers.push({ urls: url, username: env.turn.username, credential: env.turn.credential });
    }
  }

  return { iceServers };
};

export const getCallHistory = async (userId, { limit: rawLimit, cursor: rawCursor }) => {
  const limit = parseLimit(rawLimit);
  const cursor = decodeCursor(rawCursor);

  const rows = await callsRepo.findCallHistoryForUser({ userId, cursor, limit });
  const { items, nextCursor } = buildPaginatedResponse(rows, limit);

  return { items: items.map((row) => serializeCall(row, userId)), nextCursor };
};
