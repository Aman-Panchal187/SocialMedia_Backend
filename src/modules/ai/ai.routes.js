import { Router } from 'express';
import authenticate from '../../middlewares/authenticate.js';
import { aiRateLimiter } from '../../middlewares/rateLimiter.js';
import { uploadCaptionMedia } from '../../middlewares/upload.js';
import * as aiController from './ai.controller.js';

const router = Router();

router.use(authenticate, aiRateLimiter);

/**
 * @openapi
 * /ai/caption-suggestion:
 *   post:
 *     tags: [AI]
 *     summary: Best-effort AI-generated caption suggestion for an image (never blocks post creation)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               media:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Suggestion generated, or null if the AI provider is unavailable/unconfigured
 */
router.post('/caption-suggestion', uploadCaptionMedia, aiController.getCaptionSuggestion);

export default router;
