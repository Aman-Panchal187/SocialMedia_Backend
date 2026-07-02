import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../../src/app.js';
import db from '../../src/models/index.js';
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from '../setup/testDb.js';

const USER = {
  username: 'aiuser',
  email: 'aiuser@example.com',
  password: 'Password123!',
};

const TINY_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

const getLatestOtpCode = async (email, purpose) => {
  const otp = await db.Otp.findOne({ where: { email, purpose }, order: [['createdAt', 'DESC']] });
  const code = '123456';
  await otp.update({ codeHash: await bcrypt.hash(code, 4) });
  return code;
};

const registerAndVerify = async (payload) => {
  await request(app).post('/api/v1/auth/register').send(payload);
  const code = await getLatestOtpCode(payload.email, 'email_verify');
  const verifyRes = await request(app).post('/api/v1/auth/verify-otp').send({ email: payload.email, code });
  return { accessToken: verifyRes.body.data.accessToken };
};

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await clearTestDatabase();
});

describe('AI caption suggestion', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await request(app)
      .post('/api/v1/ai/caption-suggestion')
      .attach('media', TINY_PNG_BUFFER, 'test.png');
    expect(res.status).toBe(401);
  });

  it('rejects a request with no file attached', async () => {
    const { accessToken } = await registerAndVerify(USER);
    const res = await request(app)
      .post('/api/v1/ai/caption-suggestion')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(400);
  });

  it('gracefully returns a null suggestion when HUGGINGFACE_API_KEY is not configured', async () => {
    const { accessToken } = await registerAndVerify(USER);
    const res = await request(app)
      .post('/api/v1/ai/caption-suggestion')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('media', TINY_PNG_BUFFER, 'test.png');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ suggestion: null });
  });
});
