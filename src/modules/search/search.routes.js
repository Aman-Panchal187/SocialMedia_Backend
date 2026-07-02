import { Router } from 'express';
import authenticate from '../../middlewares/authenticate.js';
import validate from '../../middlewares/validate.js';
import * as searchController from './search.controller.js';
import {
  searchUsersQuerySchema,
  recentSearchesQuerySchema,
  recordSearchBodySchema,
  searchedUserIdParamSchema,
} from './search.validator.js';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /search/users:
 *   get:
 *     tags: [Search]
 *     summary: Search users by username or full name (prefix match first, then contains)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Matching users, annotated with follow status }
 */
router.get('/users', validate(searchUsersQuerySchema), searchController.searchUsers);

/**
 * @openapi
 * /search/recent:
 *   get:
 *     tags: [Search]
 *     summary: List the current user's recent searches, most recent first
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Recent searches }
 */
router.get('/recent', validate(recentSearchesQuerySchema), searchController.getRecentSearches);

/**
 * @openapi
 * /search/recent:
 *   post:
 *     tags: [Search]
 *     summary: Record a user selection as a recent search (upsert, bumps to top)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               searchedUserId: { type: string, format: uuid }
 *     responses:
 *       201: { description: Search recorded }
 */
router.post('/recent', validate(recordSearchBodySchema), searchController.recordSearch);

/**
 * @openapi
 * /search/recent/{searchedUserId}:
 *   delete:
 *     tags: [Search]
 *     summary: Remove a single recent-search entry
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Recent search removed }
 */
router.delete(
  '/recent/:searchedUserId',
  validate(searchedUserIdParamSchema),
  searchController.deleteRecentSearch
);

/**
 * @openapi
 * /search/recent:
 *   delete:
 *     tags: [Search]
 *     summary: Clear all recent searches for the current user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Recent searches cleared }
 */
router.delete('/recent', searchController.clearRecentSearches);

export default router;
