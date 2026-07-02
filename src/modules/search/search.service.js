import ApiError from '../../utils/ApiError.js';
import * as searchRepo from './search.repository.js';

const serializeUserRow = (user) => ({
  id: user.id,
  username: user.username,
  fullName: user.fullName,
  avatarUrl: user.avatarUrl,
  isPrivate: user.isPrivate,
});

export const searchUsers = async (currentUserId, term, limit) => {
  const prefixUsernameMatches = await searchRepo.findByUsernamePrefix(term, currentUserId, limit);
  const merged = [...prefixUsernameMatches];
  const foundIds = merged.map((user) => user.id);

  if (merged.length < limit) {
    const prefixFullNameMatches = await searchRepo.findByFullNamePrefix(
      term,
      currentUserId,
      limit - merged.length
    );
    for (const user of prefixFullNameMatches) {
      if (!foundIds.includes(user.id)) {
        merged.push(user);
        foundIds.push(user.id);
      }
    }
  }

  if (merged.length < limit) {
    const containsMatches = await searchRepo.findByContains(
      term,
      currentUserId,
      foundIds,
      limit - merged.length
    );
    for (const user of containsMatches) {
      if (!foundIds.includes(user.id)) {
        merged.push(user);
        foundIds.push(user.id);
      }
    }
  }

  const capped = merged.slice(0, limit);
  const statusMap = await searchRepo.findFollowStatusMap(
    currentUserId,
    capped.map((user) => user.id)
  );

  return capped.map((user) => {
    const status = statusMap.get(user.id);
    return {
      ...serializeUserRow(user),
      isFollowing: status === 'accepted',
      isFollowRequested: status === 'pending',
    };
  });
};

export const getRecentSearches = async (currentUserId, limit) => {
  const rows = await searchRepo.findRecentSearches(currentUserId, limit);
  return rows.map((row) => ({
    searchedAt: row.updatedAt,
    user: serializeUserRow(row.searchedUser),
  }));
};

export const recordSearch = async (currentUserId, searchedUserId) => {
  if (searchedUserId === currentUserId) return;

  const target = await searchRepo.findUserById(searchedUserId);
  if (!target) throw ApiError.notFound('User not found');

  await searchRepo.upsertSearchRecord(currentUserId, searchedUserId);
};

export const deleteRecentSearch = (currentUserId, searchedUserId) =>
  searchRepo.destroyRecentSearch(currentUserId, searchedUserId);

export const clearRecentSearches = (currentUserId) => searchRepo.destroyAllRecentSearches(currentUserId);
