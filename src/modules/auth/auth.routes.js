import { Router } from 'express';
import authenticate from '../../middlewares/authenticate.js';
import validate from '../../middlewares/validate.js';
import { authRateLimiter } from '../../middlewares/rateLimiter.js';
import * as authController from './auth.controller.js';
import {
  registerSchema,
  verifyOtpSchema,
  resendOtpSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.validator.js';

const router = Router();

router.use(authRateLimiter);

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new (unverified) user and send an email-verify OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *     responses:
 *       201: { description: Registered, verification OTP sent }
 */
router.post('/register', validate(registerSchema), authController.register);

/**
 * @openapi
 * /auth/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify email with OTP and receive a session
 *     responses:
 *       200: { description: Verified, session issued }
 */
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);

/**
 * @openapi
 * /auth/resend-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Resend an OTP for a given purpose
 *     responses:
 *       200: { description: OTP resent if applicable }
 */
router.post('/resend-otp', validate(resendOtpSchema), authController.resendOtp);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email or username + password
 *     responses:
 *       200: { description: Session issued }
 *       401: { description: Invalid credentials }
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @openapi
 * /auth/refresh-token:
 *   post:
 *     tags: [Auth]
 *     summary: Rotate the refresh token cookie and issue a new access token
 *     responses:
 *       200: { description: New access token issued }
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password-reset OTP (always 200, no enumeration)
 *     responses:
 *       200: { description: OTP sent if the account exists }
 */
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using a valid OTP
 *     responses:
 *       200: { description: Password reset }
 */
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Revoke the current device's refresh token
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Logged out }
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @openapi
 * /auth/logout-all:
 *   post:
 *     tags: [Auth]
 *     summary: Revoke all refresh tokens for the current user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Logged out of all devices }
 */
router.post('/logout-all', authenticate, authController.logoutAll);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the current authenticated user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Current user }
 */
router.get('/me', authenticate, authController.getMe);

export default router;
