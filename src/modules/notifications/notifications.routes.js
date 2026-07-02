import { Router } from 'express';
import authenticate from '../../middlewares/authenticate.js';
import validate from '../../middlewares/validate.js';
import * as notificationsController from './notifications.controller.js';
import { listQuerySchema, notificationIdParamSchema } from './notifications.validator.js';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Cursor-paginated notifications for the current user
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *     responses:
 *       200: { description: Notifications page }
 */
router.get('/', validate(listQuerySchema), notificationsController.listNotifications);

/**
 * @openapi
 * /notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Get the current user's unread notification count
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Unread count }
 */
router.get('/unread-count', notificationsController.getUnreadCount);

/**
 * @openapi
 * /notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark a single notification as read
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Notification marked as read }
 *       404: { description: Notification not found }
 */
router.patch('/:id/read', validate(notificationIdParamSchema), notificationsController.markAsRead);

/**
 * @openapi
 * /notifications/read-all:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark all of the current user's notifications as read
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: All notifications marked as read }
 */
router.patch('/read-all', notificationsController.markAllAsRead);

export default router;
