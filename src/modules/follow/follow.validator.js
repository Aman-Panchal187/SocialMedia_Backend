import Joi from 'joi';

const paginationQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).optional(),
  cursor: Joi.string().optional(),
});

export const usernameParamSchema = {
  params: Joi.object({
    username: Joi.string().required(),
  }),
};

export const listQuerySchema = {
  params: Joi.object({
    username: Joi.string().required(),
  }),
  query: paginationQuerySchema,
};

export const requestsQuerySchema = {
  query: paginationQuerySchema,
};
