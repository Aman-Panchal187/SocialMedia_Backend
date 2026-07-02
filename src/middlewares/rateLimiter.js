import rateLimit from 'express-rate-limit';
import ApiError from '../utils/ApiError.js';

const buildLimiter = ({ windowMs, max }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
      next(ApiError.rateLimited('Too many requests, please try again later'));
    },
  });

export const authRateLimiter = buildLimiter({ windowMs: 60 * 1000, max: 10 });

export const apiRateLimiter = buildLimiter({ windowMs: 60 * 1000, max: 100 });

export const aiRateLimiter = buildLimiter({ windowMs: 60 * 1000, max: 10 });
