import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../../src/app.js';
import db from '../../src/models/index.js';
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from '../setup/testDb.js';

const USER_A = {
  username: 'notifuserA',
  email: 'notifuserA@example.com',
  password: 'Password123!',
};

const USER_B = {
  username: 'notifuserB',
  email: 'notifuserB@example.com',
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

const createPostForUser = async (userId) => {
  const post = await db.Post.create({ userId, type: 'image', caption: 'Test post' });
  await db.PostMedia.create({
    postId: post.id,
    mediaUrl: 'https://example.com/test.jpg',
    publicId: 'test-public-id',
    mediaType: 'image',
    position: 0,
  });
  return post;
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

describe('Notifications', () => {
  it('creates a like notification for the post author, fetchable via GET /notifications', async () => {
    const a = await registerAndVerify(USER_A);
    const b = await registerAndVerify(USER_B);
    const post = await createPostForUser(b.user.id);

    const likeRes = await request(app)
      .post(`/api/v1/posts/${post.id}/like`)
      .set('Authorization', `Bearer ${a.accessToken}`);
    expect(likeRes.status).toBe(200);

    const listRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${b.accessToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.items).toHaveLength(1);
    expect(listRes.body.data.items[0]).toMatchObject({
      type: 'like',
      entityType: 'post',
      entityId: post.id,
      isRead: false,
    });
    expect(listRes.body.data.items[0].actor.username).toBe(USER_A.username);
  });

  it('does not create a notification when liking your own post', async () => {
    const a = await registerAndVerify(USER_A);
    const post = await createPostForUser(a.user.id);

    await request(app).post(`/api/v1/posts/${post.id}/like`).set('Authorization', `Bearer ${a.accessToken}`);

    const listRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${a.accessToken}`);
    expect(listRes.body.data.items).toHaveLength(0);
  });

  it('creates a comment notification for the post author on a top-level comment', async () => {
    const a = await registerAndVerify(USER_A);
    const b = await registerAndVerify(USER_B);
    const post = await createPostForUser(b.user.id);

    const commentRes = await request(app)
      .post(`/api/v1/posts/${post.id}/comments`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ content: 'Nice post!' });
    expect(commentRes.status).toBe(201);

    const listRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${b.accessToken}`);
    expect(listRes.body.data.items).toHaveLength(1);
    expect(listRes.body.data.items[0]).toMatchObject({
      type: 'comment',
      entityType: 'post',
      entityId: post.id,
    });
  });

  it('does not create a notification when commenting on your own post', async () => {
    const a = await registerAndVerify(USER_A);
    const post = await createPostForUser(a.user.id);

    await request(app)
      .post(`/api/v1/posts/${post.id}/comments`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ content: 'My own comment' });

    const listRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${a.accessToken}`);
    expect(listRes.body.data.items).toHaveLength(0);
  });

  it('notifies the comment author (not the post owner) on a reply', async () => {
    const a = await registerAndVerify(USER_A);
    const b = await registerAndVerify(USER_B);
    const post = await createPostForUser(a.user.id);

    const topLevelRes = await request(app)
      .post(`/api/v1/posts/${post.id}/comments`)
      .set('Authorization', `Bearer ${b.accessToken}`)
      .send({ content: 'First comment' });
    expect(topLevelRes.status).toBe(201);
    const parentCommentId = topLevelRes.body.data.id;

    await db.Notification.destroy({ where: {} });

    const replyRes = await request(app)
      .post(`/api/v1/posts/${post.id}/comments`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ content: 'A reply', parentCommentId });
    expect(replyRes.status).toBe(201);

    const bNotifications = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${b.accessToken}`);
    expect(bNotifications.body.data.items).toHaveLength(1);
    expect(bNotifications.body.data.items[0]).toMatchObject({
      type: 'reply',
      entityType: 'post',
      entityId: post.id,
    });

    const aNotifications = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${a.accessToken}`);
    expect(aNotifications.body.data.items).toHaveLength(0);
  });

  it('creates a follow notification when following a public account', async () => {
    const a = await registerAndVerify(USER_A);
    const b = await registerAndVerify(USER_B);

    const followRes = await request(app)
      .post(`/api/v1/follow/${USER_B.username}`)
      .set('Authorization', `Bearer ${a.accessToken}`);
    expect(followRes.status).toBe(201);
    expect(followRes.body.data.status).toBe('accepted');

    const listRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${b.accessToken}`);
    expect(listRes.body.data.items).toHaveLength(1);
    expect(listRes.body.data.items[0]).toMatchObject({
      type: 'follow',
      entityType: 'user',
      entityId: a.user.id,
    });
  });

  it('creates a follow_request notification when following a private account, then follow on accept', async () => {
    const a = await registerAndVerify(USER_A);
    const b = await registerAndVerify(USER_B);
    await db.User.update({ isPrivate: true }, { where: { id: b.user.id } });

    const followRes = await request(app)
      .post(`/api/v1/follow/${USER_B.username}`)
      .set('Authorization', `Bearer ${a.accessToken}`);
    expect(followRes.status).toBe(201);
    expect(followRes.body.data.status).toBe('pending');

    const bListRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${b.accessToken}`);
    expect(bListRes.body.data.items).toHaveLength(1);
    expect(bListRes.body.data.items[0]).toMatchObject({
      type: 'follow_request',
      entityType: 'user',
      entityId: a.user.id,
    });

    const acceptRes = await request(app)
      .post(`/api/v1/follow/requests/${USER_A.username}/accept`)
      .set('Authorization', `Bearer ${b.accessToken}`);
    expect(acceptRes.status).toBe(200);

    const aListRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${a.accessToken}`);
    expect(aListRes.body.data.items).toHaveLength(1);
    expect(aListRes.body.data.items[0]).toMatchObject({
      type: 'follow',
      entityType: 'user',
      entityId: b.user.id,
    });
  });

  it('marks a single notification read and reflects it in unread-count', async () => {
    const a = await registerAndVerify(USER_A);
    const b = await registerAndVerify(USER_B);
    const post = await createPostForUser(b.user.id);

    await request(app).post(`/api/v1/posts/${post.id}/like`).set('Authorization', `Bearer ${a.accessToken}`);

    const unreadBefore = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${b.accessToken}`);
    expect(unreadBefore.body.data.count).toBe(1);

    const listRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${b.accessToken}`);
    const notificationId = listRes.body.data.items[0].id;

    const markReadRes = await request(app)
      .patch(`/api/v1/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${b.accessToken}`);
    expect(markReadRes.status).toBe(200);

    const unreadAfter = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${b.accessToken}`);
    expect(unreadAfter.body.data.count).toBe(0);

    const notificationRow = await db.Notification.findByPk(notificationId);
    expect(notificationRow.isRead).toBe(true);
  });

  it('marks all notifications read via PATCH /notifications/read-all', async () => {
    const a = await registerAndVerify(USER_A);
    const b = await registerAndVerify(USER_B);
    const post = await createPostForUser(b.user.id);

    await request(app).post(`/api/v1/posts/${post.id}/like`).set('Authorization', `Bearer ${a.accessToken}`);
    await request(app)
      .post(`/api/v1/posts/${post.id}/comments`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ content: 'Another comment' });

    const unreadBefore = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${b.accessToken}`);
    expect(unreadBefore.body.data.count).toBe(2);

    const markAllRes = await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${b.accessToken}`);
    expect(markAllRes.status).toBe(200);

    const unreadAfter = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${b.accessToken}`);
    expect(unreadAfter.body.data.count).toBe(0);
  });
});
