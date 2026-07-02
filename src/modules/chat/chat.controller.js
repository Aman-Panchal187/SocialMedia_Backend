import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import * as chatService from './chat.service.js';

export const startConversation = asyncHandler(async (req, res) => {
  const conversation = await chatService.startConversation(req.user.id, req.body.username);
  new ApiResponse(res, 201, conversation);
});

export const listConversations = asyncHandler(async (req, res) => {
  const result = await chatService.listConversations(req.user.id, req.query);
  new ApiResponse(res, 200, result);
});

export const getMessages = asyncHandler(async (req, res) => {
  const result = await chatService.getMessages(req.params.conversationId, req.user.id, req.query);
  new ApiResponse(res, 200, result);
});

export const sendMessage = asyncHandler(async (req, res) => {
  const message = await chatService.sendMessage(req.params.conversationId, req.user.id, {
    contentType: req.body.contentType,
    content: req.body.content,
    file: req.file,
  });
  new ApiResponse(res, 201, message, 'Message sent');
});

export const markRead = asyncHandler(async (req, res) => {
  await chatService.markRead(req.params.conversationId, req.user.id);
  new ApiResponse(res, 200, null, 'Conversation marked as read');
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const result = await chatService.getUnreadCount(req.user.id);
  new ApiResponse(res, 200, result);
});
