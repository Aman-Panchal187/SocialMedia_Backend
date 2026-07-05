import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import * as callsService from './calls.service.js';

export const getCallHistory = asyncHandler(async (req, res) => {
  const result = await callsService.getCallHistory(req.user.id, req.query);
  new ApiResponse(res, 200, result);
});

export const getIceServers = asyncHandler(async (req, res) => {
  new ApiResponse(res, 200, callsService.getIceServers());
});
