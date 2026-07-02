import { Op } from 'sequelize';
import db from '../../models/index.js';

const { User, RefreshToken, Otp } = db;

export const findUserByEmail = (email) => User.findOne({ where: { email } });

export const findUserByUsername = (username) => User.findOne({ where: { username } });

export const findUserByEmailOrUsername = (identifier) =>
  User.findOne({ where: { [Op.or]: [{ email: identifier }, { username: identifier }] } });

export const findUserById = (id) => User.findByPk(id);

export const createUser = (attrs) => User.create(attrs);

export const markUserVerified = (user) => user.update({ isVerifiedEmail: true });

export const updateUserPassword = (user, passwordHash) => user.update({ passwordHash });

export const createOtp = (attrs) => Otp.create(attrs);

export const findLatestActiveOtp = (email, purpose) =>
  Otp.findOne({
    where: { email, purpose, consumedAt: null },
    order: [['createdAt', 'DESC']],
  });

export const incrementOtpAttempt = (otp) => otp.increment('attemptCount');

export const consumeOtp = (otp) => otp.update({ consumedAt: new Date() });

export const invalidatePendingOtps = (email, purpose) =>
  Otp.update({ consumedAt: new Date() }, { where: { email, purpose, consumedAt: null } });

export const createRefreshToken = (attrs) => RefreshToken.create(attrs);

export const findRefreshTokenByHash = (tokenHash) => RefreshToken.findOne({ where: { tokenHash } });

export const revokeRefreshToken = (tokenRow) => tokenRow.update({ isRevoked: true });

export const revokeAllUserRefreshTokens = (userId) =>
  RefreshToken.update({ isRevoked: true }, { where: { userId, isRevoked: false } });
