import { Router } from 'express';
import authenticate from '../../middlewares/authenticate.js';
import validate from '../../middlewares/validate.js';
import * as callsController from './calls.controller.js';
import { historyQuerySchema } from './calls.validator.js';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /calls/history:
 *   get:
 *     tags: [Calls]
 *     summary: Cursor-paginated voice/video call history for the current user
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *     responses:
 *       200: { description: Call history page }
 */
router.get('/history', validate(historyQuerySchema), callsController.getCallHistory);

export default router;
