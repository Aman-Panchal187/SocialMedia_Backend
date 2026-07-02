import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import * as notificationsService from './notifications.service.js';

export const listNotifications = asyncHandler(async (req, res) => {
  const result = await notificationsService.listNotifications(req.user.id, req.query);
  new ApiResponse(res, 200, result);
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const result = await notificationsService.getUnreadCount(req.user.id);
  new ApiResponse(res, 200, result);
});

export const markAsRead = asyncHandler(async (req, res) => {
  await notificationsService.markAsRead(req.params.id, req.user.id);
  new ApiResponse(res, 200, null, 'Notification marked as read');
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  await notificationsService.markAllAsRead(req.user.id);
  new ApiResponse(res, 200, null, 'All notifications marked as read');
});
