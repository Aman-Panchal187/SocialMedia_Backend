import ApiError from '../../utils/ApiError.js';
import { parseLimit, decodeCursor, buildPaginatedResponse } from '../../utils/paginationUtils.js';
import { notifyUser } from '../notifications/notifications.service.js';
import * as followRepo from './follow.repository.js';

const serializeUserRow = (user) => ({
  id: user.id,
  username: user.username,
  fullName: user.fullName,
  avatarUrl: user.avatarUrl,
});

export const followUser = async (followerId, targetUsername) => {
  const target = await followRepo.findUserByUsername(targetUsername);
  if (!target) throw ApiError.notFound('User not found');
  if (target.id === followerId) throw ApiError.badRequest('You cannot follow yourself');

  const existing = await followRepo.findFollowRow(followerId, target.id);
  if (existing) {
    throw ApiError.conflict(
      existing.status === 'pending' ? 'Follow request already sent' : 'Already following this user'
    );
  }

  const status = target.isPrivate ? 'pending' : 'accepted';
  await followRepo.createFollow(followerId, target.id, status);

  await notifyUser({
    recipientId: target.id,
    actorId: followerId,
    type: status === 'accepted' ? 'follow' : 'follow_request',
    entityType: 'user',
    entityId: followerId,
  });

  return { status };
};

export const unfollowUser = async (followerId, targetUsername) => {
  const target = await followRepo.findUserByUsername(targetUsername);
  if (!target) throw ApiError.notFound('User not found');

  const existing = await followRepo.findFollowRow(followerId, target.id);
  if (!existing) throw ApiError.notFound('Follow relationship not found');

  await followRepo.destroyFollow(existing);
};

export const acceptRequest = async (currentUserId, requesterUsername) => {
  const requester = await followRepo.findUserByUsername(requesterUsername);
  if (!requester) throw ApiError.notFound('User not found');

  const row = await followRepo.findFollowRow(requester.id, currentUserId);
  if (!row || row.status !== 'pending') throw ApiError.notFound('Pending follow request not found');

  await followRepo.updateFollowStatus(row, 'accepted');

  await notifyUser({
    recipientId: requester.id,
    actorId: currentUserId,
    type: 'follow_accepted',
    entityType: 'user',
    entityId: currentUserId,
  });
};

export const rejectRequest = async (currentUserId, requesterUsername) => {
  const requester = await followRepo.findUserByUsername(requesterUsername);
  if (!requester) throw ApiError.notFound('User not found');

  const row = await followRepo.findFollowRow(requester.id, currentUserId);
  if (!row || row.status !== 'pending') throw ApiError.notFound('Pending follow request not found');

  await followRepo.destroyFollow(row);
};

export const getPendingRequests = async (currentUserId, { limit: rawLimit, cursor: rawCursor }) => {
  const limit = parseLimit(rawLimit);
  const cursor = decodeCursor(rawCursor);

  const rows = await followRepo.findPendingIncomingRequests({ followingId: currentUserId, cursor, limit });
  const { items, nextCursor } = buildPaginatedResponse(rows, limit);

  return {
    items: items.map((row) => ({
      requestId: row.id,
      createdAt: row.createdAt,
      user: serializeUserRow(row.follower),
    })),
    nextCursor,
  };
};

export const getFollowers = async (username, { limit: rawLimit, cursor: rawCursor }) => {
  const limit = parseLimit(rawLimit);
  const cursor = decodeCursor(rawCursor);

  const target = await followRepo.findUserByUsername(username);
  if (!target) throw ApiError.notFound('User not found');

  const rows = await followRepo.findFollowers({ userId: target.id, cursor, limit });
  const { items, nextCursor } = buildPaginatedResponse(rows, limit);

  return { items: items.map((row) => serializeUserRow(row.follower)), nextCursor };
};

export const getFollowing = async (username, { limit: rawLimit, cursor: rawCursor }) => {
  const limit = parseLimit(rawLimit);
  const cursor = decodeCursor(rawCursor);

  const target = await followRepo.findUserByUsername(username);
  if (!target) throw ApiError.notFound('User not found');

  const rows = await followRepo.findFollowing({ userId: target.id, cursor, limit });
  const { items, nextCursor } = buildPaginatedResponse(rows, limit);

  return { items: items.map((row) => serializeUserRow(row.following)), nextCursor };
};
