import bcrypt from 'bcrypt';
import ApiError from '../../utils/ApiError.js';
import {
  generateOtpCode,
  hashOtpCode,
  compareOtpCode,
  getOtpExpiryDate,
  OTP_MAX_ATTEMPTS,
} from '../../utils/otpUtils.js';
import {
  signAccessToken,
  generateRefreshTokenValue,
  hashToken,
  getRefreshTokenExpiryDate,
} from '../../utils/tokenUtils.js';
import { sendOtpEmail } from '../../utils/emailUtils.js';
import logger from '../../config/logger.js';
import * as authRepo from './auth.repository.js';

const BCRYPT_COST = 12;

const sanitizeUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  fullName: user.fullName,
  bio: user.bio,
  avatarUrl: user.avatarUrl,
  isPrivate: user.isPrivate,
  isVerifiedEmail: user.isVerifiedEmail,
});

const issueOtp = async ({ userId, email, purpose }) => {
  await authRepo.invalidatePendingOtps(email, purpose);
  const code = generateOtpCode();
  const codeHash = await hashOtpCode(code);
  await authRepo.createOtp({
    userId: userId || null,
    email,
    codeHash,
    purpose,
    expiresAt: getOtpExpiryDate(),
  });
  // The OTP is already persisted at this point, so email delivery is
  // best-effort only — it must never block the request that triggered it.
  // SMTP can hang for a long time (connection/greeting/socket timeouts are
  // all measured in minutes, not seconds) on networks that throttle or block
  // outbound mail, which previously made register/resend/forgot-password
  // hang indefinitely even though the OTP itself was created successfully.
  sendOtpEmail(email, code, purpose).catch((err) => {
    logger.error(`Failed to send OTP email to ${email} (${purpose}): ${err.message}`);
  });
};

export const register = async ({ username, email, password }) => {
  const [existingEmail, existingUsername] = await Promise.all([
    authRepo.findUserByEmail(email),
    authRepo.findUserByUsername(username),
  ]);

  if (existingEmail || existingUsername) {
    throw ApiError.conflict('Username or email is already in use');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const user = await authRepo.createUser({ username, email, passwordHash });

  await issueOtp({ userId: user.id, email: user.email, purpose: 'email_verify' });

  return { userId: user.id, email: user.email };
};

const issueSession = async (user, { deviceInfo, ipAddress } = {}) => {
  const accessToken = signAccessToken(user.id);
  const refreshTokenValue = generateRefreshTokenValue();
  await authRepo.createRefreshToken({
    userId: user.id,
    tokenHash: hashToken(refreshTokenValue),
    deviceInfo: deviceInfo || null,
    ipAddress: ipAddress || null,
    expiresAt: getRefreshTokenExpiryDate(),
  });
  return { accessToken, refreshTokenValue };
};

export const verifyOtp = async ({ email, code }, requestMeta) => {
  const otp = await authRepo.findLatestActiveOtp(email, 'email_verify');
  if (!otp) throw ApiError.badRequest('No active verification code found. Please request a new one.');

  if (otp.attemptCount >= OTP_MAX_ATTEMPTS) {
    throw ApiError.badRequest('Maximum verification attempts exceeded. Please request a new code.');
  }

  if (new Date(otp.expiresAt) < new Date()) {
    throw ApiError.badRequest('Verification code has expired. Please request a new one.');
  }

  const isMatch = await compareOtpCode(code, otp.codeHash);
  if (!isMatch) {
    await authRepo.incrementOtpAttempt(otp);
    throw ApiError.badRequest('Invalid verification code');
  }

  await authRepo.consumeOtp(otp);

  const user = await authRepo.findUserByEmail(email);
  if (!user) throw ApiError.notFound('User not found');

  await authRepo.markUserVerified(user);

  const { accessToken, refreshTokenValue } = await issueSession(user, requestMeta);
  return { accessToken, refreshTokenValue, user: sanitizeUser(user) };
};

export const resendOtp = async ({ email, purpose }) => {
  const user = await authRepo.findUserByEmail(email);

  if (!user) {
    logger.debug(`resendOtp: no user for ${email}, responding generically`);
    return;
  }

  if (purpose === 'email_verify' && user.isVerifiedEmail) {
    return;
  }

  await issueOtp({ userId: user.id, email, purpose });
};

export const login = async ({ identifier, password }, requestMeta) => {
  const user = await authRepo.findUserByEmailOrUsername(identifier);
  const genericError = () => ApiError.unauthorized('Invalid credentials');

  if (!user || !user.isActive) throw genericError();

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) throw genericError();

  if (!user.isVerifiedEmail) {
    throw ApiError.forbidden('Please verify your email before logging in');
  }

  await user.update({ lastSeenAt: new Date() });

  const { accessToken, refreshTokenValue } = await issueSession(user, requestMeta);
  return { accessToken, refreshTokenValue, user: sanitizeUser(user) };
};

// Refresh tokens are single-use and rotated on every call: the old DB row is
// revoked and a brand-new row+cookie issued. If a revoked token is presented
// again, it means either a race (harmless) or the token was stolen and the
// legitimate client already rotated past it (replay attack) — either way we
// can't tell those apart, so the safe response is to revoke every session for
// that user, forcing re-authentication everywhere.
export const refreshSession = async (refreshTokenValue, requestMeta) => {
  if (!refreshTokenValue) throw ApiError.unauthorized('Missing refresh token');

  const tokenHash = hashToken(refreshTokenValue);
  const tokenRow = await authRepo.findRefreshTokenByHash(tokenHash);

  if (!tokenRow) throw ApiError.unauthorized('Invalid refresh token');

  if (tokenRow.isRevoked) {
    await authRepo.revokeAllUserRefreshTokens(tokenRow.userId);
    throw ApiError.unauthorized('Refresh token reuse detected — all sessions revoked');
  }

  if (new Date(tokenRow.expiresAt) < new Date()) {
    throw ApiError.unauthorized('Refresh token expired');
  }

  const user = await authRepo.findUserById(tokenRow.userId);
  if (!user || !user.isActive) throw ApiError.unauthorized('Invalid refresh token');

  await authRepo.revokeRefreshToken(tokenRow);
  const { accessToken, refreshTokenValue: newRefreshTokenValue } = await issueSession(user, requestMeta);

  return { accessToken, refreshTokenValue: newRefreshTokenValue };
};

export const forgotPassword = async ({ email }) => {
  const user = await authRepo.findUserByEmail(email);
  if (!user) {
    logger.debug(`forgotPassword: no user for ${email}, responding generically`);
    return;
  }
  await issueOtp({ userId: user.id, email, purpose: 'password_reset' });
};

export const resetPassword = async ({ email, code, newPassword }) => {
  const otp = await authRepo.findLatestActiveOtp(email, 'password_reset');
  if (!otp) throw ApiError.badRequest('No active reset code found. Please request a new one.');

  if (otp.attemptCount >= OTP_MAX_ATTEMPTS) {
    throw ApiError.badRequest('Maximum attempts exceeded. Please request a new code.');
  }

  if (new Date(otp.expiresAt) < new Date()) {
    throw ApiError.badRequest('Reset code has expired. Please request a new one.');
  }

  const isMatch = await compareOtpCode(code, otp.codeHash);
  if (!isMatch) {
    await authRepo.incrementOtpAttempt(otp);
    throw ApiError.badRequest('Invalid reset code');
  }

  await authRepo.consumeOtp(otp);

  const user = await authRepo.findUserByEmail(email);
  if (!user) throw ApiError.notFound('User not found');

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
  await authRepo.updateUserPassword(user, passwordHash);
  await authRepo.revokeAllUserRefreshTokens(user.id);
};

export const logout = async (refreshTokenValue) => {
  if (!refreshTokenValue) return;
  const tokenHash = hashToken(refreshTokenValue);
  const tokenRow = await authRepo.findRefreshTokenByHash(tokenHash);
  if (tokenRow && !tokenRow.isRevoked) {
    await authRepo.revokeRefreshToken(tokenRow);
  }
};

export const logoutAll = async (userId) => {
  await authRepo.revokeAllUserRefreshTokens(userId);
};

export const getMe = async (userId) => {
  const user = await authRepo.findUserById(userId);
  if (!user) throw ApiError.notFound('User not found');
  return sanitizeUser(user);
};

export { sanitizeUser };
