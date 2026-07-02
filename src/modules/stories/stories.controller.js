import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import * as storiesService from './stories.service.js';

export const createStory = asyncHandler(async (req, res) => {
  const story = await storiesService.createStory(req.user.id, {
    caption: req.body.caption,
    file: req.file,
  });
  new ApiResponse(res, 201, story, 'Story created');
});

export const deleteStory = asyncHandler(async (req, res) => {
  await storiesService.deleteStory(req.params.storyId, req.user.id);
  new ApiResponse(res, 200, null, 'Story deleted');
});

export const getStoryFeed = asyncHandler(async (req, res) => {
  const feed = await storiesService.getStoryFeed(req.user.id);
  new ApiResponse(res, 200, feed);
});

export const getUserStories = asyncHandler(async (req, res) => {
  const result = await storiesService.getUserStories(req.params.username, req.user.id);
  new ApiResponse(res, 200, result);
});

export const viewStory = asyncHandler(async (req, res) => {
  await storiesService.viewStory(req.params.storyId, req.user.id);
  new ApiResponse(res, 200, null, 'Story viewed');
});

export const reactToStory = asyncHandler(async (req, res) => {
  await storiesService.reactToStory(req.params.storyId, req.user.id, req.body.emoji);
  new ApiResponse(res, 200, null, 'Reaction sent');
});

export const replyToStory = asyncHandler(async (req, res) => {
  const message = await storiesService.replyToStory(req.params.storyId, req.user.id, req.body.content);
  new ApiResponse(res, 201, message, 'Reply sent');
});

export const getStoryViewers = asyncHandler(async (req, res) => {
  const result = await storiesService.getStoryViewers(req.params.storyId, req.user.id, req.query);
  new ApiResponse(res, 200, result);
});
