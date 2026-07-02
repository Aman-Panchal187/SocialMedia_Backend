import ApiError from './ApiError.js';

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export const parseLimit = (rawLimit) => {
  if (!rawLimit) return DEFAULT_LIMIT;
  const parsed = Number(rawLimit);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw ApiError.badRequest('limit must be a positive integer');
  }
  return Math.min(parsed, MAX_LIMIT);
};

export const encodeCursor = ({ createdAt, id }) =>
  Buffer.from(JSON.stringify({ createdAt, id }), 'utf8').toString('base64');

export const decodeCursor = (cursor) => {
  if (!cursor) return null;
  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
    if (!decoded.createdAt || !decoded.id) throw new Error('invalid cursor shape');
    return decoded;
  } catch {
    throw ApiError.badRequest('Invalid cursor');
  }
};

export const buildPaginatedResponse = (rows, limit, getCursorValue = (row) => row.createdAt) => {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  const nextCursor = hasMore && last ? encodeCursor({ createdAt: getCursorValue(last), id: last.id }) : null;
  return { items, nextCursor };
};
