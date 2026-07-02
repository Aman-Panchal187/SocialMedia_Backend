import Joi from 'joi';

const usernamePattern = /^[a-zA-Z0-9._]{3,30}$/;

export const getByUsernameSchema = {
  params: Joi.object({
    username: Joi.string().required(),
  }),
};

export const updateMeSchema = {
  body: Joi.object({
    fullName: Joi.string().max(100).allow('').optional(),
    bio: Joi.string().max(150).allow('').optional(),
    username: Joi.string().pattern(usernamePattern).optional(),
  }).min(1),
};

export const updatePrivacySchema = {
  body: Joi.object({
    isPrivate: Joi.boolean().required(),
  }),
};
