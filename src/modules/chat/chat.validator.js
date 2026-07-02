import Joi from 'joi';

const uuidSchema = Joi.string().uuid({ version: 'uuidv4' });

const paginationQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).optional(),
  cursor: Joi.string().optional(),
});

export const conversationIdParamSchema = {
  params: Joi.object({
    conversationId: uuidSchema.required(),
  }),
};

export const startConversationSchema = {
  body: Joi.object({
    username: Joi.string().required(),
  }),
};

export const listConversationsSchema = {
  query: paginationQuerySchema,
};

export const listMessagesSchema = {
  params: Joi.object({
    conversationId: uuidSchema.required(),
  }),
  query: paginationQuerySchema,
};

export const sendMessageSchema = {
  params: Joi.object({
    conversationId: uuidSchema.required(),
  }),
  body: Joi.object({
    contentType: Joi.string().valid('text', 'image', 'video', 'file').required(),
    content: Joi.string().max(4000).when('contentType', {
      is: 'text',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  }),
};
