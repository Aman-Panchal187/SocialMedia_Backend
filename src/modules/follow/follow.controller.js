import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import * as followService from './follow.service.js';

export const followUser = asyncHandler(async (req, res) => {
  const result = await followService.followUser(req.user.id, req.params.username);
  new ApiResponse(res, 201, result, result.status === 'pending' ? 'Follow request sent' : 'Now following');
});

export const unfollowUser = asyncHandler(async (req, res) => {
  await followService.unfollowUser(req.user.id, req.params.username);
  new ApiResponse(res, 200, null, 'Unfollowed');
});

export const acceptRequest = asyncHandler(async (req, res) => {
  await followService.acceptRequest(req.user.id, req.params.username);
  new ApiResponse(res, 200, null, 'Follow request accepted');
});

export const rejectRequest = asyncHandler(async (req, res) => {
  await followService.rejectRequest(req.user.id, req.params.username);
  new ApiResponse(res, 200, null, 'Follow request rejected');
});

export const getPendingRequests = asyncHandler(async (req, res) => {
  const result = await followService.getPendingRequests(req.user.id, req.query);
  new ApiResponse(res, 200, result);
});

export const getFollowers = asyncHandler(async (req, res) => {
  const result = await followService.getFollowers(req.params.username, req.query);
  new ApiResponse(res, 200, result);
});

export const getFollowing = asyncHandler(async (req, res) => {
  const result = await followService.getFollowing(req.params.username, req.query);
  new ApiResponse(res, 200, result);
});
