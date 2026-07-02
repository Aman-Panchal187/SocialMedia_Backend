import { Router } from 'express';
import authenticate from '../../middlewares/authenticate.js';
import validate from '../../middlewares/validate.js';
import { uploadChatAttachment } from '../../middlewares/upload.js';
import * as chatController from './chat.controller.js';
import {
  startConversationSchema,
  listConversationsSchema,
  listMessagesSchema,
  sendMessageSchema,
  conversationIdParamSchema,
} from './chat.validator.js';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /chat/conversations:
 *   post:
 *     tags: [Chat]
 *     summary: Start (or get) a direct conversation with a mutual follower
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: string }
 *     responses:
 *       201: { description: Conversation started or fetched }
 *       403: { description: Not mutual followers }
 *       404: { description: User not found }
 */
router.post('/conversations', validate(startConversationSchema), chatController.startConversation);

/**
 * @openapi
 * /chat/conversations:
 *   get:
 *     tags: [Chat]
 *     summary: Cursor-paginated list of the current user's conversations
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *     responses:
 *       200: { description: Conversations page }
 */
router.get('/conversations', validate(listConversationsSchema), chatController.listConversations);

/**
 * @openapi
 * /chat/conversations/{conversationId}/messages:
 *   get:
 *     tags: [Chat]
 *     summary: Cursor-paginated messages in a conversation
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *     responses:
 *       200: { description: Messages page }
 *       403: { description: Not a participant }
 */
router.get(
  '/conversations/:conversationId/messages',
  validate(listMessagesSchema),
  chatController.getMessages
);

/**
 * @openapi
 * /chat/conversations/{conversationId}/messages:
 *   post:
 *     tags: [Chat]
 *     summary: Send a text or attachment message in a conversation
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               contentType: { type: string, enum: [text, image, video, file] }
 *               content: { type: string }
 *               attachment: { type: string, format: binary }
 *     responses:
 *       201: { description: Message sent }
 *       403: { description: Not a participant }
 */
router.post(
  '/conversations/:conversationId/messages',
  uploadChatAttachment,
  validate(sendMessageSchema),
  chatController.sendMessage
);

/**
 * @openapi
 * /chat/conversations/{conversationId}/read:
 *   patch:
 *     tags: [Chat]
 *     summary: Mark all of the other participant's messages as read
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Conversation marked as read }
 *       403: { description: Not a participant }
 */
router.patch(
  '/conversations/:conversationId/read',
  validate(conversationIdParamSchema),
  chatController.markRead
);

/**
 * @openapi
 * /chat/unread-count:
 *   get:
 *     tags: [Chat]
 *     summary: Get the current user's total unread message count
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Unread count }
 */
router.get('/unread-count', chatController.getUnreadCount);

export default router;
