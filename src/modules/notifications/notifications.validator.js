import Joi from 'joi';

const uuidSchema = Joi.string().uuid({ version: 'uuidv4' });

const paginationQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).optional(),
  cursor: Joi.string().optional(),
});

export const listQuerySchema = {
  query: paginationQuerySchema,
};

export const notificationIdParamSchema = {
  params: Joi.object({
    id: uuidSchema.required(),
  }),
};
