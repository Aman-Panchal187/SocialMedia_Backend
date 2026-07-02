import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import * as searchService from './search.service.js';

export const searchUsers = asyncHandler(async (req, res) => {
  const { q, limit = 20 } = req.query;
  const result = await searchService.searchUsers(req.user.id, q, limit);
  new ApiResponse(res, 200, result);
});

export const getRecentSearches = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const result = await searchService.getRecentSearches(req.user.id, limit);
  new ApiResponse(res, 200, result);
});

export const recordSearch = asyncHandler(async (req, res) => {
  await searchService.recordSearch(req.user.id, req.body.searchedUserId);
  new ApiResponse(res, 201, null, 'Search recorded');
});

export const deleteRecentSearch = asyncHandler(async (req, res) => {
  await searchService.deleteRecentSearch(req.user.id, req.params.searchedUserId);
  new ApiResponse(res, 200, null, 'Recent search removed');
});

export const clearRecentSearches = asyncHandler(async (req, res) => {
  await searchService.clearRecentSearches(req.user.id);
  new ApiResponse(res, 200, null, 'Recent searches cleared');
});
