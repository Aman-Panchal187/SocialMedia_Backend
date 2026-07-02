import { Router } from 'express';
import authenticate from '../../middlewares/authenticate.js';
import validate from '../../middlewares/validate.js';
import { uploadStoryMedia } from '../../middlewares/upload.js';
import * as storiesController from './stories.controller.js';
import {
  createStorySchema,
  storyIdParamSchema,
  userStoriesSchema,
  reactToStorySchema,
  replyToStorySchema,
  storyViewersSchema,
} from './stories.validator.js';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /stories:
 *   post:
 *     tags: [Stories]
 *     summary: Create a 24h-expiring story (single image or video)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               media: { type: string, format: binary }
 *               caption: { type: string }
 *     responses:
 *       201: { description: Story created }
 */
router.post('/', uploadStoryMedia, validate(createStorySchema), storiesController.createStory);

/**
 * @openapi
 * /stories/feed:
 *   get:
 *     tags: [Stories]
 *     summary: Story tray — active stories of followed users plus own, grouped into per-author rings
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Story feed }
 */
router.get('/feed', storiesController.getStoryFeed);

/**
 * @openapi
 * /stories/user/{username}:
 *   get:
 *     tags: [Stories]
 *     summary: A single author's active stories (private-account visibility enforced)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Author's active stories }
 *       403: { description: Private account }
 *       404: { description: User not found }
 */
router.get('/user/:username', validate(userStoriesSchema), storiesController.getUserStories);

/**
 * @openapi
 * /stories/{storyId}:
 *   delete:
 *     tags: [Stories]
 *     summary: Delete own story
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Story deleted }
 *       403: { description: Not the owner }
 *       404: { description: Story not found }
 */
router.delete('/:storyId', validate(storyIdParamSchema), storiesController.deleteStory);

/**
 * @openapi
 * /stories/{storyId}/view:
 *   post:
 *     tags: [Stories]
 *     summary: Mark a story as viewed by the current user (idempotent view-count increment)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Story marked viewed }
 *       404: { description: Story not found or expired }
 */
router.post('/:storyId/view', validate(storyIdParamSchema), storiesController.viewStory);

/**
 * @openapi
 * /stories/{storyId}/react:
 *   post:
 *     tags: [Stories]
 *     summary: React to a story with an emoji (replaces any existing reaction from this user)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emoji: { type: string }
 *     responses:
 *       200: { description: Reaction sent }
 */
router.post('/:storyId/react', validate(reactToStorySchema), storiesController.reactToStory);

/**
 * @openapi
 * /stories/{storyId}/reply:
 *   post:
 *     tags: [Stories]
 *     summary: Reply to a story (delivered as a direct chat message; mutual-follow required)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content: { type: string }
 *     responses:
 *       201: { description: Reply sent }
 *       403: { description: Not mutual followers }
 */
router.post('/:storyId/reply', validate(replyToStorySchema), storiesController.replyToStory);

/**
 * @openapi
 * /stories/{storyId}/viewers:
 *   get:
 *     tags: [Stories]
 *     summary: Cursor-paginated list of viewers (owner-only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *     responses:
 *       200: { description: Viewers page }
 *       403: { description: Not the owner }
 */
router.get('/:storyId/viewers', validate(storyViewersSchema), storiesController.getStoryViewers);

export default router;
