import { Router } from 'express';
import authenticate from '../../middlewares/authenticate.js';
import optionalAuthenticate from '../../middlewares/optionalAuthenticate.js';
import validate from '../../middlewares/validate.js';
import { uploadAvatar } from '../../middlewares/upload.js';
import * as usersController from './users.controller.js';
import { getByUsernameSchema, updateMeSchema, updatePrivacySchema } from './users.validator.js';

const router = Router();

/**
 * @openapi
 * /users/me/stats:
 *   get:
 *     tags: [Users]
 *     summary: Get post/follower/following counts for the current user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Stats }
 */
router.get('/me/stats', authenticate, usersController.getMyStats);

/**
 * @openapi
 * /users/me:
 *   patch:
 *     tags: [Users]
 *     summary: Update the current user's profile fields
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Updated user }
 */
router.patch('/me', authenticate, validate(updateMeSchema), usersController.updateMe);

/**
 * @openapi
 * /users/me/avatar:
 *   patch:
 *     tags: [Users]
 *     summary: Upload/replace the current user's avatar
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar: { type: string, format: binary }
 *     responses:
 *       200: { description: Updated user }
 */
router.patch('/me/avatar', authenticate, uploadAvatar, usersController.updateAvatar);

/**
 * @openapi
 * /users/me/privacy:
 *   patch:
 *     tags: [Users]
 *     summary: Toggle the current user's account privacy
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Updated user }
 */
router.patch('/me/privacy', authenticate, validate(updatePrivacySchema), usersController.updatePrivacy);

/**
 * @openapi
 * /users/{username}:
 *   get:
 *     tags: [Users]
 *     summary: Get a public profile by username
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Profile }
 *       404: { description: Not found }
 */
router.get('/:username', optionalAuthenticate, validate(getByUsernameSchema), usersController.getByUsername);

export default router;
