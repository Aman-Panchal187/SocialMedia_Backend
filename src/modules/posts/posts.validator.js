import Joi from 'joi';

const uuidSchema = Joi.string().uuid({ version: 'uuidv4' });

const paginationQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).optional(),
  cursor: Joi.string().optional(),
});

export const createPostSchema = {
  body: Joi.object({
    caption: Joi.string().max(2200).allow('').optional(),
    hashtags: Joi.alternatives()
      .try(Joi.array().items(Joi.string().max(50)), Joi.string().max(50))
      .optional(),
    location: Joi.string().max(255).allow('').optional(),
  }),
};

export const postIdParamSchema = {
  params: Joi.object({
    postId: uuidSchema.required(),
  }),
};

export const updatePostSchema = {
  params: Joi.object({
    postId: uuidSchema.required(),
  }),
  body: Joi.object({
    caption: Joi.string().max(2200).allow('').required(),
  }),
};

export const feedQuerySchema = {
  query: paginationQuerySchema,
};

export const userPostsSchema = {
  params: Joi.object({
    username: Joi.string().required(),
  }),
  query: paginationQuerySchema,
};

export const commentsListSchema = {
  params: Joi.object({
    postId: uuidSchema.required(),
  }),
  query: paginationQuerySchema,
};

export const repliesListSchema = {
  params: Joi.object({
    commentId: uuidSchema.required(),
  }),
  query: paginationQuerySchema,
};

export const createCommentSchema = {
  params: Joi.object({
    postId: uuidSchema.required(),
  }),
  body: Joi.object({
    content: Joi.string().max(2200).min(1).required(),
    parentCommentId: uuidSchema.optional(),
  }),
};

export const commentIdParamSchema = {
  params: Joi.object({
    commentId: uuidSchema.required(),
  }),
};
