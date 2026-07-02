import asyncHandler from '../../utils/asyncHandler.js';
import ApiResponse from '../../utils/ApiResponse.js';
import env from '../../config/env.js';
import * as authService from './auth.service.js';

const REFRESH_COOKIE_NAME = 'refreshToken';

const refreshCookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'strict',
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const setRefreshCookie = (res, token) => {
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions);
};

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, { ...refreshCookieOptions, maxAge: undefined });
};

const requestMeta = (req) => ({
  deviceInfo: req.headers['user-agent'] || null,
  ipAddress: req.ip,
});

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  new ApiResponse(res, 201, result, 'Registration successful. Please verify your email.');
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { accessToken, refreshTokenValue, user } = await authService.verifyOtp(req.body, requestMeta(req));
  setRefreshCookie(res, refreshTokenValue);
  new ApiResponse(res, 200, { accessToken, user }, 'Email verified successfully');
});

export const resendOtp = asyncHandler(async (req, res) => {
  await authService.resendOtp(req.body);
  new ApiResponse(res, 200, null, 'If the account exists, a new code has been sent');
});

export const login = asyncHandler(async (req, res) => {
  const { accessToken, refreshTokenValue, user } = await authService.login(req.body, requestMeta(req));
  setRefreshCookie(res, refreshTokenValue);
  new ApiResponse(res, 200, { accessToken, user }, 'Login successful');
});

export const refreshToken = asyncHandler(async (req, res) => {
  const incomingToken = req.cookies?.[REFRESH_COOKIE_NAME];
  const { accessToken, refreshTokenValue } = await authService.refreshSession(incomingToken, requestMeta(req));
  setRefreshCookie(res, refreshTokenValue);
  new ApiResponse(res, 200, { accessToken });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body);
  new ApiResponse(res, 200, null, 'If the account exists, a reset code has been sent');
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body);
  new ApiResponse(res, 200, null, 'Password reset successful');
});

export const logout = asyncHandler(async (req, res) => {
  const incomingToken = req.cookies?.[REFRESH_COOKIE_NAME];
  await authService.logout(incomingToken);
  clearRefreshCookie(res);
  new ApiResponse(res, 200, null, 'Logged out');
});

export const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll(req.user.id);
  clearRefreshCookie(res);
  new ApiResponse(res, 200, null, 'Logged out of all devices');
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  new ApiResponse(res, 200, { user });
});
