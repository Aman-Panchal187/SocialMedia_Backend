import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../../src/app.js';
import db from '../../src/models/index.js';
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from '../setup/testDb.js';

const USER_A = {
  username: 'calluserA',
  email: 'calluserA@example.com',
  password: 'Password123!',
};

const USER_B = {
  username: 'calluserB',
  email: 'calluserB@example.com',
  password: 'Password123!',
};

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
  return {
    accessToken: verifyRes.body.data.accessToken,
    user: verifyRes.body.data.user,
  };
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

describe('Calls', () => {
  it('rejects an unauthenticated request to GET /calls/history', async () => {
    const res = await request(app).get('/api/v1/calls/history');
    expect(res.status).toBe(401);
  });

  it('returns call history for both participants with correct direction and pagination shape', async () => {
    const a = await registerAndVerify(USER_A);
    const b = await registerAndVerify(USER_B);

    const completedCall = await db.Call.create({
      callerId: a.user.id,
      calleeId: b.user.id,
      callType: 'video',
      status: 'completed',
      startedAt: new Date(Date.now() - 60000),
      endedAt: new Date(),
      durationSec: 60,
    });

    const missedCall = await db.Call.create({
      callerId: b.user.id,
      calleeId: a.user.id,
      callType: 'voice',
      status: 'missed',
      startedAt: null,
      endedAt: new Date(),
      durationSec: null,
    });

    const rejectedCall = await db.Call.create({
      callerId: a.user.id,
      calleeId: b.user.id,
      callType: 'voice',
      status: 'rejected',
      startedAt: null,
      endedAt: new Date(),
      durationSec: null,
    });

    const aHistoryRes = await request(app)
      .get('/api/v1/calls/history')
      .set('Authorization', `Bearer ${a.accessToken}`);
    expect(aHistoryRes.status).toBe(200);
    expect(aHistoryRes.body.data).toHaveProperty('items');
    expect(aHistoryRes.body.data).toHaveProperty('nextCursor');
    expect(aHistoryRes.body.data.nextCursor).toBeNull();
    expect(aHistoryRes.body.data.items).toHaveLength(3);

    const aById = Object.fromEntries(aHistoryRes.body.data.items.map((item) => [item.id, item]));

    expect(aById[completedCall.id]).toMatchObject({
      direction: 'outgoing',
      callType: 'video',
      status: 'completed',
      durationSec: 60,
    });
    expect(aById[completedCall.id].otherUser).toMatchObject({
      id: b.user.id,
      username: USER_B.username,
    });

    expect(aById[missedCall.id]).toMatchObject({
      direction: 'incoming',
      callType: 'voice',
      status: 'missed',
    });
    expect(aById[missedCall.id].otherUser).toMatchObject({
      id: b.user.id,
      username: USER_B.username,
    });

    expect(aById[rejectedCall.id]).toMatchObject({
      direction: 'outgoing',
      callType: 'voice',
      status: 'rejected',
    });

    const bHistoryRes = await request(app)
      .get('/api/v1/calls/history')
      .set('Authorization', `Bearer ${b.accessToken}`);
    expect(bHistoryRes.status).toBe(200);
    expect(bHistoryRes.body.data.items).toHaveLength(3);

    const bById = Object.fromEntries(bHistoryRes.body.data.items.map((item) => [item.id, item]));

    expect(bById[completedCall.id]).toMatchObject({
      direction: 'incoming',
      status: 'completed',
    });
    expect(bById[completedCall.id].otherUser).toMatchObject({
      id: a.user.id,
      username: USER_A.username,
    });

    expect(bById[missedCall.id]).toMatchObject({
      direction: 'outgoing',
      status: 'missed',
    });

    expect(bById[rejectedCall.id]).toMatchObject({
      direction: 'incoming',
      status: 'rejected',
    });
  });

  it('paginates call history with limit and cursor', async () => {
    const a = await registerAndVerify(USER_A);
    const b = await registerAndVerify(USER_B);

    const calls = [];
    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const call = await db.Call.create({
        callerId: a.user.id,
        calleeId: b.user.id,
        callType: 'voice',
        status: 'completed',
        startedAt: new Date(),
        endedAt: new Date(),
        durationSec: 10 + i,
      });
      calls.push(call);
    }

    const firstPage = await request(app)
      .get('/api/v1/calls/history')
      .query({ limit: 2 })
      .set('Authorization', `Bearer ${a.accessToken}`);
    expect(firstPage.status).toBe(200);
    expect(firstPage.body.data.items).toHaveLength(2);
    expect(firstPage.body.data.nextCursor).not.toBeNull();

    const secondPage = await request(app)
      .get('/api/v1/calls/history')
      .query({ limit: 2, cursor: firstPage.body.data.nextCursor })
      .set('Authorization', `Bearer ${a.accessToken}`);
    expect(secondPage.status).toBe(200);
    expect(secondPage.body.data.items).toHaveLength(1);
    expect(secondPage.body.data.nextCursor).toBeNull();

    const allIds = [...firstPage.body.data.items, ...secondPage.body.data.items].map((item) => item.id).sort();
    expect(allIds).toEqual(calls.map((c) => c.id).sort());
  });
});
