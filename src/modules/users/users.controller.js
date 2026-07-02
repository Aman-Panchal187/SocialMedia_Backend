import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import * as usersService from './users.service.js';
import { sanitizeUser } from '../auth/auth.service.js';

export const getByUsername = asyncHandler(async (req, res) => {
  const profile = await usersService.getProfileByUsername(req.params.username, req.user?.id);
  new ApiResponse(res, 200, profile);
});

export const updateMe = asyncHandler(async (req, res) => {
  const user = await usersService.updateMe(req.user.id, req.body);
  new ApiResponse(res, 200, { user: sanitizeUser(user) }, 'Profile updated');
});

export const updateAvatar = asyncHandler(async (req, res) => {
  const user = await usersService.updateAvatar(req.user.id, req.file);
  new ApiResponse(res, 200, { user: sanitizeUser(user) }, 'Avatar updated');
});

export const updatePrivacy = asyncHandler(async (req, res) => {
  const user = await usersService.updatePrivacy(req.user.id, req.body.isPrivate);
  new ApiResponse(res, 200, { user: sanitizeUser(user) }, 'Privacy setting updated');
});

export const getMyStats = asyncHandler(async (req, res) => {
  const stats = await usersService.getMyStats(req.user.id);
  new ApiResponse(res, 200, stats);
});
