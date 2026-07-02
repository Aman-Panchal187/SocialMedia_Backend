import Joi from 'joi';

const uuidSchema = Joi.string().uuid({ version: 'uuidv4' });

export const searchUsersQuerySchema = {
  query: Joi.object({
    q: Joi.string().trim().min(1).max(100).required(),
    limit: Joi.number().integer().min(1).max(30).default(20).optional(),
  }),
};

export const recentSearchesQuerySchema = {
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(30).default(10).optional(),
  }),
};

export const recordSearchBodySchema = {
  body: Joi.object({
    searchedUserId: uuidSchema.required(),
  }),
};

export const searchedUserIdParamSchema = {
  params: Joi.object({
    searchedUserId: uuidSchema.required(),
  }),
};
