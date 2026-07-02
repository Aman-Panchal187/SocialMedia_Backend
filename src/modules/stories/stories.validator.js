import Joi from 'joi';

const uuidSchema = Joi.string().uuid({ version: 'uuidv4' });

const paginationQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).optional(),
  cursor: Joi.string().optional(),
});

export const createStorySchema = {
  body: Joi.object({
    caption: Joi.string().max(2200).allow('').optional(),
  }),
};

export const storyIdParamSchema = {
  params: Joi.object({
    storyId: uuidSchema.required(),
  }),
};

export const userStoriesSchema = {
  params: Joi.object({
    username: Joi.string().required(),
  }),
};

export const reactToStorySchema = {
  params: Joi.object({
    storyId: uuidSchema.required(),
  }),
  body: Joi.object({
    emoji: Joi.string().min(1).max(8).required(),
  }),
};

export const replyToStorySchema = {
  params: Joi.object({
    storyId: uuidSchema.required(),
  }),
  body: Joi.object({
    content: Joi.string().min(1).max(4000).required(),
  }),
};

export const storyViewersSchema = {
  params: Joi.object({
    storyId: uuidSchema.required(),
  }),
  query: paginationQuerySchema,
};
