import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../../src/app.js';
import db from '../../src/models/index.js';
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from '../setup/testDb.js';

const SEARCHER = {
  username: 'searcheruser',
  email: 'searcheruser@example.com',
  password: 'Password123!',
};

const TARGET = {
  username: 'johndoe',
  email: 'johndoe@example.com',
  password: 'Password123!',
  fullName: 'Jonathan Doeman',
};

const OTHER = {
  username: 'otherperson',
  email: 'otherperson@example.com',
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

describe('Search', () => {
  it('finds a user by username prefix, excludes the searcher, and reports isFollowing', async () => {
    const searcher = await registerAndVerify(SEARCHER);
    const target = await registerAndVerify(TARGET);

    await request(app)
      .post(`/api/v1/follow/${TARGET.username}`)
      .set('Authorization', `Bearer ${searcher.accessToken}`);

    const res = await request(app)
      .get('/api/v1/search/users')
      .query({ q: 'joh' })
      .set('Authorization', `Bearer ${searcher.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      id: target.user.id,
      username: TARGET.username,
      isFollowing: true,
      isFollowRequested: false,
    });
    expect(res.body.data.every((u) => u.id !== searcher.user.id)).toBe(true);
  });

  it('finds a user by username contains-match fallback', async () => {
    const searcher = await registerAndVerify(SEARCHER);
    const target = await registerAndVerify(TARGET);

    const res = await request(app)
      .get('/api/v1/search/users')
      .query({ q: 'hndo' })
      .set('Authorization', `Bearer ${searcher.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.map((u) => u.id)).toContain(target.user.id);
  });

  it('finds a user by full-name prefix match', async () => {
    const searcher = await registerAndVerify(SEARCHER);
    const target = await registerAndVerify(TARGET);
    await db.User.update({ fullName: TARGET.fullName }, { where: { id: target.user.id } });

    const res = await request(app)
      .get('/api/v1/search/users')
      .query({ q: 'Jonathan' })
      .set('Authorization', `Bearer ${searcher.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.map((u) => u.id)).toContain(target.user.id);
  });

  it('records searches, most-recent-first, and bumps a re-searched user to the top without duplicating', async () => {
    const searcher = await registerAndVerify(SEARCHER);
    const target = await registerAndVerify(TARGET);
    const other = await registerAndVerify(OTHER);

    const record1 = await request(app)
      .post('/api/v1/search/recent')
      .set('Authorization', `Bearer ${searcher.accessToken}`)
      .send({ searchedUserId: target.user.id });
    expect(record1.status).toBe(201);

    const record2 = await request(app)
      .post('/api/v1/search/recent')
      .set('Authorization', `Bearer ${searcher.accessToken}`)
      .send({ searchedUserId: other.user.id });
    expect(record2.status).toBe(201);

    let recentRes = await request(app)
      .get('/api/v1/search/recent')
      .set('Authorization', `Bearer ${searcher.accessToken}`);
    expect(recentRes.status).toBe(200);
    expect(recentRes.body.data).toHaveLength(2);
    expect(recentRes.body.data[0].user.id).toBe(other.user.id);
    expect(recentRes.body.data[1].user.id).toBe(target.user.id);

    const record3 = await request(app)
      .post('/api/v1/search/recent')
      .set('Authorization', `Bearer ${searcher.accessToken}`)
      .send({ searchedUserId: target.user.id });
    expect(record3.status).toBe(201);

    recentRes = await request(app)
      .get('/api/v1/search/recent')
      .set('Authorization', `Bearer ${searcher.accessToken}`);
    expect(recentRes.body.data).toHaveLength(2);
    expect(recentRes.body.data[0].user.id).toBe(target.user.id);
    expect(recentRes.body.data.filter((r) => r.user.id === target.user.id)).toHaveLength(1);
  });

  it('deletes a single recent search and clears all recent searches', async () => {
    const searcher = await registerAndVerify(SEARCHER);
    const target = await registerAndVerify(TARGET);
    const other = await registerAndVerify(OTHER);

    await request(app)
      .post('/api/v1/search/recent')
      .set('Authorization', `Bearer ${searcher.accessToken}`)
      .send({ searchedUserId: target.user.id });
    await request(app)
      .post('/api/v1/search/recent')
      .set('Authorization', `Bearer ${searcher.accessToken}`)
      .send({ searchedUserId: other.user.id });

    const deleteOneRes = await request(app)
      .delete(`/api/v1/search/recent/${target.user.id}`)
      .set('Authorization', `Bearer ${searcher.accessToken}`);
    expect(deleteOneRes.status).toBe(200);

    let recentRes = await request(app)
      .get('/api/v1/search/recent')
      .set('Authorization', `Bearer ${searcher.accessToken}`);
    expect(recentRes.body.data).toHaveLength(1);
    expect(recentRes.body.data[0].user.id).toBe(other.user.id);

    const clearAllRes = await request(app)
      .delete('/api/v1/search/recent')
      .set('Authorization', `Bearer ${searcher.accessToken}`);
    expect(clearAllRes.status).toBe(200);

    recentRes = await request(app)
      .get('/api/v1/search/recent')
      .set('Authorization', `Bearer ${searcher.accessToken}`);
    expect(recentRes.body.data).toHaveLength(0);
  });

  it('rejects unauthenticated requests to every search route', async () => {
    const target = await registerAndVerify(TARGET);

    const searchRes = await request(app).get('/api/v1/search/users').query({ q: 'joh' });
    expect(searchRes.status).toBe(401);

    const recentRes = await request(app).get('/api/v1/search/recent');
    expect(recentRes.status).toBe(401);

    const recordRes = await request(app)
      .post('/api/v1/search/recent')
      .send({ searchedUserId: target.user.id });
    expect(recordRes.status).toBe(401);

    const deleteOneRes = await request(app).delete(`/api/v1/search/recent/${target.user.id}`);
    expect(deleteOneRes.status).toBe(401);

    const clearAllRes = await request(app).delete('/api/v1/search/recent');
    expect(clearAllRes.status).toBe(401);
  });
});
