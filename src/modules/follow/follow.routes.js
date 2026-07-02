import { Router } from 'express';
import authenticate from '../../middlewares/authenticate.js';
import validate from '../../middlewares/validate.js';
import * as followController from './follow.controller.js';
import { usernameParamSchema, listQuerySchema, requestsQuerySchema } from './follow.validator.js';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /follow/requests:
 *   get:
 *     tags: [Follow]
 *     summary: List pending incoming follow requests
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Pending requests page }
 */
router.get('/requests', validate(requestsQuerySchema), followController.getPendingRequests);

/**
 * @openapi
 * /follow/requests/{username}/accept:
 *   post:
 *     tags: [Follow]
 *     summary: Accept a pending follow request
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Accepted }
 */
router.post('/requests/:username/accept', validate(usernameParamSchema), followController.acceptRequest);

/**
 * @openapi
 * /follow/requests/{username}/reject:
 *   post:
 *     tags: [Follow]
 *     summary: Reject a pending follow request
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Rejected }
 */
router.post('/requests/:username/reject', validate(usernameParamSchema), followController.rejectRequest);

/**
 * @openapi
 * /follow/{username}/followers:
 *   get:
 *     tags: [Follow]
 *     summary: Cursor-paginated accepted followers of a user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Followers page }
 */
router.get('/:username/followers', validate(listQuerySchema), followController.getFollowers);

/**
 * @openapi
 * /follow/{username}/following:
 *   get:
 *     tags: [Follow]
 *     summary: Cursor-paginated accepted following of a user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Following page }
 */
router.get('/:username/following', validate(listQuerySchema), followController.getFollowing);

/**
 * @openapi
 * /follow/{username}:
 *   post:
 *     tags: [Follow]
 *     summary: Follow a user (creates a pending row if the target is private)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Followed or requested }
 */
router.post('/:username', validate(usernameParamSchema), followController.followUser);

/**
 * @openapi
 * /follow/{username}:
 *   delete:
 *     tags: [Follow]
 *     summary: Unfollow a user or cancel a pending request
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Unfollowed }
 */
router.delete('/:username', validate(usernameParamSchema), followController.unfollowUser);

export default router;
