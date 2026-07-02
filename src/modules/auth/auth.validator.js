import Joi from 'joi';

const usernamePattern = /^[a-zA-Z0-9._]{3,30}$/;

export const registerSchema = {
  body: Joi.object({
    username: Joi.string().pattern(usernamePattern).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).required(),
  }),
};

export const verifyOtpSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    code: Joi.string().length(6).pattern(/^\d+$/).required(),
  }),
};

export const resendOtpSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    purpose: Joi.string().valid('email_verify', 'password_reset').required(),
  }),
};

export const loginSchema = {
  body: Joi.object({
    identifier: Joi.string().required(),
    password: Joi.string().required(),
  }),
};

export const forgotPasswordSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
  }),
};

export const resetPasswordSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    code: Joi.string().length(6).pattern(/^\d+$/).required(),
    newPassword: Joi.string().min(8).max(128).required(),
  }),
};
