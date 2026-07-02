import ApiError from '../../utils/ApiError.js';
import { uploadBufferToCloudinary, destroyCloudinaryAsset } from '../../config/cloudinary.js';
import { bufferMatchesImageMagicBytes } from '../../middlewares/upload.js';
import * as usersRepo from './users.repository.js';

const buildProfileResponse = async (targetUser, viewerId) => {
  const { postCount, followerCount, followingCount } = await usersRepo.getProfileCounts(targetUser.id);

  const isOwnProfile = viewerId === targetUser.id;
  let isFollowing = false;
  let isFollowRequested = false;

  if (viewerId && !isOwnProfile) {
    const followRow = await usersRepo.findFollowRow(viewerId, targetUser.id);
    if (followRow) {
      isFollowing = followRow.status === 'accepted';
      isFollowRequested = followRow.status === 'pending';
    }
  }

  return {
    id: targetUser.id,
    username: targetUser.username,
    fullName: targetUser.fullName,
    bio: targetUser.bio,
    avatarUrl: targetUser.avatarUrl,
    isPrivate: targetUser.isPrivate,
    postCount,
    followerCount,
    followingCount,
    isFollowing,
    isFollowRequested,
    isOwnProfile,
  };
};

export const getProfileByUsername = async (username, viewerId) => {
  const user = await usersRepo.findUserByUsername(username);
  if (!user) throw ApiError.notFound('User not found');
  return buildProfileResponse(user, viewerId);
};

export const updateMe = async (userId, updates) => {
  const user = await usersRepo.findUserById(userId);
  if (!user) throw ApiError.notFound('User not found');

  if (updates.username && updates.username !== user.username) {
    const existing = await usersRepo.findUserByUsernameExcludingId(updates.username, userId);
    if (existing) throw ApiError.conflict('Username is already taken');
  }

  await usersRepo.updateUser(user, updates);
  return user;
};

export const updateAvatar = async (userId, file) => {
  if (!file) throw ApiError.badRequest('Avatar file is required');

  if (!bufferMatchesImageMagicBytes(file.buffer)) {
    throw ApiError.badRequest('File content does not match a supported image format');
  }

  const user = await usersRepo.findUserById(userId);
  if (!user) throw ApiError.notFound('User not found');

  const result = await uploadBufferToCloudinary(file.buffer, {
    folder: 'instagram-clone/avatars',
    resource_type: 'image',
    transformation: [{ width: 512, height: 512, crop: 'fill', gravity: 'face' }],
  });

  const previousPublicId = user.avatarPublicId;

  await usersRepo.updateUser(user, {
    avatarUrl: result.secure_url,
    avatarPublicId: result.public_id,
  });

  if (previousPublicId) {
    destroyCloudinaryAsset(previousPublicId).catch(() => {});
  }

  return user;
};

export const updatePrivacy = async (userId, isPrivate) => {
  const user = await usersRepo.findUserById(userId);
  if (!user) throw ApiError.notFound('User not found');
  await usersRepo.updateUser(user, { isPrivate });
  return user;
};

export const getMyStats = async (userId) => usersRepo.getProfileCounts(userId);
