import Joi from 'joi';

const paginationQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).optional(),
  cursor: Joi.string().optional(),
});

export const historyQuerySchema = {
  query: paginationQuerySchema,
};
