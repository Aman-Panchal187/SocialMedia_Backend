import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import * as postsService from './posts.service.js';

export const createPost = asyncHandler(async (req, res) => {
  const post = await postsService.createPost({
    userId: req.user.id,
    caption: req.body.caption,
    hashtags: req.body.hashtags,
    location: req.body.location,
    files: req.files,
  });
  new ApiResponse(res, 201, post, 'Post created');
});

export const getFeed = asyncHandler(async (req, res) => {
  const feed = await postsService.getFeed(req.user.id, req.query);
  new ApiResponse(res, 200, feed);
});

export const getPostById = asyncHandler(async (req, res) => {
  const post = await postsService.getPostById(req.params.postId, req.user?.id);
  new ApiResponse(res, 200, post);
});

export const deletePost = asyncHandler(async (req, res) => {
  await postsService.deletePost(req.params.postId, req.user.id);
  new ApiResponse(res, 200, null, 'Post deleted');
});

export const updatePost = asyncHandler(async (req, res) => {
  const post = await postsService.updatePostCaption(req.params.postId, req.user.id, req.body.caption);
  new ApiResponse(res, 200, post, 'Post updated');
});

export const getPostsByUsername = asyncHandler(async (req, res) => {
  const result = await postsService.getPostsByUsername(req.params.username, req.user?.id, req.query);
  new ApiResponse(res, 200, result);
});

export const getSavedPosts = asyncHandler(async (req, res) => {
  const result = await postsService.getSavedPosts(req.user.id, req.query);
  new ApiResponse(res, 200, result);
});

export const likePost = asyncHandler(async (req, res) => {
  await postsService.likePost(req.params.postId, req.user.id);
  new ApiResponse(res, 200, null, 'Post liked');
});

export const unlikePost = asyncHandler(async (req, res) => {
  await postsService.unlikePost(req.params.postId, req.user.id);
  new ApiResponse(res, 200, null, 'Post unliked');
});

export const savePost = asyncHandler(async (req, res) => {
  await postsService.savePost(req.params.postId, req.user.id);
  new ApiResponse(res, 200, null, 'Post saved');
});

export const unsavePost = asyncHandler(async (req, res) => {
  await postsService.unsavePost(req.params.postId, req.user.id);
  new ApiResponse(res, 200, null, 'Post unsaved');
});

export const getComments = asyncHandler(async (req, res) => {
  const result = await postsService.getComments(req.params.postId, req.user?.id, req.query);
  new ApiResponse(res, 200, result);
});

export const getReplies = asyncHandler(async (req, res) => {
  const result = await postsService.getReplies(req.params.commentId, req.query);
  new ApiResponse(res, 200, result);
});

export const createComment = asyncHandler(async (req, res) => {
  const comment = await postsService.createComment(req.params.postId, req.user.id, req.body);
  new ApiResponse(res, 201, comment, 'Comment created');
});

export const deleteComment = asyncHandler(async (req, res) => {
  await postsService.deleteComment(req.params.commentId, req.user.id);
  new ApiResponse(res, 200, null, 'Comment deleted');
});

export const likeComment = asyncHandler(async (req, res) => {
  await postsService.likeComment(req.params.commentId, req.user.id);
  new ApiResponse(res, 200, null, 'Comment liked');
});

export const unlikeComment = asyncHandler(async (req, res) => {
  await postsService.unlikeComment(req.params.commentId, req.user.id);
  new ApiResponse(res, 200, null, 'Comment unliked');
});
