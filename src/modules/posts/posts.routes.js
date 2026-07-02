import { Router } from 'express';
import authenticate from '../../middlewares/authenticate.js';
import optionalAuthenticate from '../../middlewares/optionalAuthenticate.js';
import validate from '../../middlewares/validate.js';
import { uploadPostMedia } from '../../middlewares/upload.js';
import * as postsController from './posts.controller.js';
import {
  createPostSchema,
  postIdParamSchema,
  updatePostSchema,
  feedQuerySchema,
  userPostsSchema,
  commentsListSchema,
  repliesListSchema,
  createCommentSchema,
  commentIdParamSchema,
} from './posts.validator.js';

const router = Router();

/**
 * @openapi
 * /posts:
 *   post:
 *     tags: [Posts]
 *     summary: Create a post (multi-media, caption, hashtags)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               media:
 *                 type: array
 *                 items: { type: string, format: binary }
 *               caption: { type: string }
 *               hashtags:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       201: { description: Post created }
 */
router.post('/', authenticate, uploadPostMedia, validate(createPostSchema), postsController.createPost);

/**
 * @openapi
 * /posts/feed:
 *   get:
 *     tags: [Posts]
 *     summary: Cursor-paginated feed of followed users' posts plus own posts
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *     responses:
 *       200: { description: Feed page }
 */
router.get('/feed', authenticate, validate(feedQuerySchema), postsController.getFeed);

/**
 * @openapi
 * /posts/user/{username}:
 *   get:
 *     tags: [Posts]
 *     summary: Cursor-paginated grid of a user's posts
 *     responses:
 *       200: { description: Posts page }
 */
router.get('/user/:username', optionalAuthenticate, validate(userPostsSchema), postsController.getPostsByUsername);

/**
 * @openapi
 * /posts/comments/{commentId}/replies:
 *   get:
 *     tags: [Posts]
 *     summary: Cursor-paginated replies to a comment
 *     responses:
 *       200: { description: Replies page }
 */
router.get('/comments/:commentId/replies', validate(repliesListSchema), postsController.getReplies);

/**
 * @openapi
 * /posts/comments/{commentId}:
 *   delete:
 *     tags: [Posts]
 *     summary: Soft-delete a comment (owner or post owner)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Comment deleted }
 */
router.delete('/comments/:commentId', authenticate, validate(commentIdParamSchema), postsController.deleteComment);

/**
 * @openapi
 * /posts/comments/{commentId}/like:
 *   post:
 *     tags: [Posts]
 *     summary: Like a comment
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Comment liked }
 */
router.post('/comments/:commentId/like', authenticate, validate(commentIdParamSchema), postsController.likeComment);

/**
 * @openapi
 * /posts/comments/{commentId}/like:
 *   delete:
 *     tags: [Posts]
 *     summary: Unlike a comment
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Comment unliked }
 */
router.delete('/comments/:commentId/like', authenticate, validate(commentIdParamSchema), postsController.unlikeComment);

/**
 * @openapi
 * /posts/{postId}:
 *   get:
 *     tags: [Posts]
 *     summary: Get a single post (private-account visibility enforced)
 *     responses:
 *       200: { description: Post }
 *       403: { description: Private account }
 *       404: { description: Not found }
 */
router.get('/:postId', optionalAuthenticate, validate(postIdParamSchema), postsController.getPostById);

/**
 * @openapi
 * /posts/{postId}:
 *   delete:
 *     tags: [Posts]
 *     summary: Soft-delete own post
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Post deleted }
 */
router.delete('/:postId', authenticate, validate(postIdParamSchema), postsController.deletePost);

/**
 * @openapi
 * /posts/{postId}:
 *   patch:
 *     tags: [Posts]
 *     summary: Update own post's caption
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Post updated }
 */
router.patch('/:postId', authenticate, validate(updatePostSchema), postsController.updatePost);

/**
 * @openapi
 * /posts/{postId}/like:
 *   post:
 *     tags: [Posts]
 *     summary: Like a post
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Post liked }
 */
router.post('/:postId/like', authenticate, validate(postIdParamSchema), postsController.likePost);

/**
 * @openapi
 * /posts/{postId}/like:
 *   delete:
 *     tags: [Posts]
 *     summary: Unlike a post
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Post unliked }
 */
router.delete('/:postId/like', authenticate, validate(postIdParamSchema), postsController.unlikePost);

/**
 * @openapi
 * /posts/{postId}/save:
 *   post:
 *     tags: [Posts]
 *     summary: Save a post
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Post saved }
 */
router.post('/:postId/save', authenticate, validate(postIdParamSchema), postsController.savePost);

/**
 * @openapi
 * /posts/{postId}/save:
 *   delete:
 *     tags: [Posts]
 *     summary: Unsave a post
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Post unsaved }
 */
router.delete('/:postId/save', authenticate, validate(postIdParamSchema), postsController.unsavePost);

/**
 * @openapi
 * /posts/{postId}/comments:
 *   get:
 *     tags: [Posts]
 *     summary: Cursor-paginated top-level comments
 *     responses:
 *       200: { description: Comments page }
 */
router.get('/:postId/comments', optionalAuthenticate, validate(commentsListSchema), postsController.getComments);

/**
 * @openapi
 * /posts/{postId}/comments:
 *   post:
 *     tags: [Posts]
 *     summary: Create a comment or a one-level reply
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Comment created }
 */
router.post('/:postId/comments', authenticate, validate(createCommentSchema), postsController.createComment);

export default router;
