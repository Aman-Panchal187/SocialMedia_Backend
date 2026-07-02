import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../../src/app.js';
import db from '../../src/models/index.js';
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from '../setup/testDb.js';

const USER_A = {
  username: 'storyuserA',
  email: 'storyuserA@example.com',
  password: 'Password123!',
};

const USER_B = {
  username: 'storyuserB',
  email: 'storyuserB@example.com',
  password: 'Password123!',
};

const USER_C = {
  username: 'storyuserC',
  email: 'storyuserC@example.com',
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

const makeMutualFollowers = async (a, b) => {
  await request(app).post(`/api/v1/follow/${b.user.username}`).set('Authorization', `Bearer ${a.accessToken}`);
  await request(app).post(`/api/v1/follow/${a.user.username}`).set('Authorization', `Bearer ${b.accessToken}`);
};

const createStoryForUser = async (userId, overrides = {}) =>
  db.Story.create({
    userId,
    mediaUrl: 'https://example.com/story.jpg',
    publicId: 'test-story-public-id',
    mediaType: 'image',
    caption: 'Test story',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    ...overrides,
  });

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await clearTestDatabase();
});

describe('Stories', () => {
  it('a created story appears in the own feed and a follower feed', async () => {
    const a = await registerAndVerify(USER_A);
    const b = await registerAndVerify(USER_B);
    await request(app).post(`/api/v1/follow/${a.user.username}`).set('Authorization', `Bearer ${b.accessToken}`);

    const story = await createStoryForUser(a.user.id);

    const ownFeedRes = await request(app).get('/api/v1/stories/feed').set('Authorization', `Bearer ${a.accessToken}`);
    expect(ownFeedRes.status).toBe(200);
    expect(ownFeedRes.body.data.items).toHaveLength(1);
    expect(ownFeedRes.body.data.items[0].stories[0].id).toBe(story.id);

    const followerFeedRes = await request(app)
      .get('/api/v1/stories/feed')
      .set('Authorization', `Bearer ${b.accessToken}`);
    expect(followerFeedRes.status).toBe(200);
    expect(followerFeedRes.body.data.items).toHaveLength(1);
    expect(followerFeedRes.body.data.items[0].author.username).toBe(USER_A.username);
    expect(followerFeedRes.body.data.items[0].hasUnviewed).toBe(true);
  });

  it('excludes/forbids a non-follower of a private account from GET /stories/user/:username', async () => {
    const a = await registerAndVerify(USER_A);
    const c = await registerAndVerify(USER_C);
    await db.User.update({ isPrivate: true }, { where: { id: a.user.id } });
    await createStoryForUser(a.user.id);

    const res = await request(app)
      .get(`/api/v1/stories/user/${USER_A.username}`)
      .set('Authorization', `Bearer ${c.accessToken}`);
    expect(res.status).toBe(403);
  });

  it('allows a follower of a private account to view stories via GET /stories/user/:username', async () => {
    const a = await registerAndVerify(USER_A);
    const b = await registerAndVerify(USER_B);
    await db.User.update({ isPrivate: true }, { where: { id: a.user.id } });
    await db.Follow.create({ followerId: b.user.id, followingId: a.user.id, status: 'accepted' });
    const story = await createStoryForUser(a.user.id);

    const res = await request(app)
      .get(`/api/v1/stories/user/${USER_A.username}`)
      .set('Authorization', `Bearer ${b.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].id).toBe(story.id);
  });

  it('repeated POST /:storyId/view from the same viewer increments viewCount exactly once', async () => {
    const a = await registerAndVerify(USER_A);
    const b = await registerAndVerify(USER_B);
    const story = await createStoryForUser(a.user.id);

    const first = await request(app)
      .post(`/api/v1/stories/${story.id}/view`)
      .set('Authorization', `Bearer ${b.accessToken}`);
    expect(first.status).toBe(200);

    const second = await request(app)
      .post(`/api/v1/stories/${story.id}/view`)
      .set('Authorization', `Bearer ${b.accessToken}`);
    expect(second.status).toBe(200);

    const third = await request(app)
      .post(`/api/v1/stories/${story.id}/view`)
      .set('Authorization', `Bearer ${b.accessToken}`);
    expect(third.status).toBe(200);

    const updated = await db.Story.findByPk(story.id);
    expect(updated.viewCount).toBe(1);

    const viewRows = await db.StoryView.findAll({ where: { storyId: story.id, viewerId: b.user.id } });
    expect(viewRows).toHaveLength(1);
  });

  it('reacting twice replaces rather than duplicates the reaction', async () => {
    const a = await registerAndVerify(USER_A);
    const b = await registerAndVerify(USER_B);
    const story = await createStoryForUser(a.user.id);

    const firstReact = await request(app)
      .post(`/api/v1/stories/${story.id}/react`)
      .set('Authorization', `Bearer ${b.accessToken}`)
      .send({ emoji: '🔥' });
    expect(firstReact.status).toBe(200);

    const secondReact = await request(app)
      .post(`/api/v1/stories/${story.id}/react`)
      .set('Authorization', `Bearer ${b.accessToken}`)
      .send({ emoji: '❤️' });
    expect(secondReact.status).toBe(200);

    const reactions = await db.StoryReaction.findAll({ where: { storyId: story.id, userId: b.user.id } });
    expect(reactions).toHaveLength(1);
    expect(reactions[0].reactionEmoji).toBe('❤️');
  });

  it('replying between mutual followers creates a message with replyToStoryId and a story_reply notification', async () => {
    const a = await registerAndVerify(USER_A);
    const b = await registerAndVerify(USER_B);
    await makeMutualFollowers(a, b);
    const story = await createStoryForUser(a.user.id);

    const replyRes = await request(app)
      .post(`/api/v1/stories/${story.id}/reply`)
      .set('Authorization', `Bearer ${b.accessToken}`)
      .send({ content: 'Nice story!' });
    expect(replyRes.status).toBe(201);
    expect(replyRes.body.data.content).toBe('Nice story!');
    expect(replyRes.body.data.replyToStoryId).toBe(story.id);

    const messageRow = await db.Message.findByPk(replyRes.body.data.id);
    expect(messageRow.replyToStoryId).toBe(story.id);

    const notifRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${a.accessToken}`);
    expect(notifRes.status).toBe(200);
    expect(notifRes.body.data.items).toHaveLength(1);
    expect(notifRes.body.data.items[0]).toMatchObject({
      type: 'story_reply',
      entityType: 'story',
      entityId: story.id,
    });
  });

  it('returns 403 when replying without mutual-follow', async () => {
    const a = await registerAndVerify(USER_A);
    const b = await registerAndVerify(USER_B);
    const story = await createStoryForUser(a.user.id);

    const replyRes = await request(app)
      .post(`/api/v1/stories/${story.id}/reply`)
      .set('Authorization', `Bearer ${b.accessToken}`)
      .send({ content: 'Trying to reply' });
    expect(replyRes.status).toBe(403);
  });

  it('GET /:storyId/viewers is forbidden for non-owners', async () => {
    const a = await registerAndVerify(USER_A);
    const b = await registerAndVerify(USER_B);
    const story = await createStoryForUser(a.user.id);

    await request(app).post(`/api/v1/stories/${story.id}/view`).set('Authorization', `Bearer ${b.accessToken}`);

    const nonOwnerRes = await request(app)
      .get(`/api/v1/stories/${story.id}/viewers`)
      .set('Authorization', `Bearer ${b.accessToken}`);
    expect(nonOwnerRes.status).toBe(403);

    const ownerRes = await request(app)
      .get(`/api/v1/stories/${story.id}/viewers`)
      .set('Authorization', `Bearer ${a.accessToken}`);
    expect(ownerRes.status).toBe(200);
    expect(ownerRes.body.data.items).toHaveLength(1);
    expect(ownerRes.body.data.items[0].viewer.username).toBe(USER_B.username);
  });
});
