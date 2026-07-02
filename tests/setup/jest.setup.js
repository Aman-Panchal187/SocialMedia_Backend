import dotenv from 'dotenv';
import { jest } from '@jest/globals';

dotenv.config();
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_access_secret_please_ignore';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_please_ignore';
process.env.COOKIE_SECRET = process.env.COOKIE_SECRET || 'test_cookie_secret_please_ignore';

jest.setTimeout(30000);
