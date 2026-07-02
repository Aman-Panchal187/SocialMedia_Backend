import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import env from '../config/env.js';

export const signAccessToken = (userId) =>
  jwt.sign({ userId }, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpiresIn });

export const verifyAccessToken = (token) => jwt.verify(token, env.jwt.accessSecret);

export const generateRefreshTokenValue = () => crypto.randomBytes(48).toString('hex');

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const getRefreshTokenExpiryDate = () => {
  const ms = parseDurationToMs(env.jwt.refreshExpiresIn);
  return new Date(Date.now() + ms);
};

function parseDurationToMs(duration) {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unit = match[2];
  const unitMs = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * unitMs[unit];
}
