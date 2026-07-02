import asyncHandler from '../../utils/asyncHandler.js';
import ApiError from '../../utils/ApiError.js';
import ApiResponse from '../../utils/ApiResponse.js';
import * as aiService from './ai.service.js';

export const getCaptionSuggestion = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('An image file is required');

  const suggestion = await aiService.suggestCaption(req.file.buffer, req.file.mimetype);
  new ApiResponse(res, 200, { suggestion });
});
