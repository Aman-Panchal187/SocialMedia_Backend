'use strict';

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

const DEMO_PASSWORD_HASH_COST = 12;

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const passwordHash = await bcrypt.hash('Password123!', DEMO_PASSWORD_HASH_COST);

    const users = [
      { id: uuidv4(), username: 'alice', email: 'alice@example.com', fullName: 'Alice Anderson', bio: 'Coffee & code.', isPrivate: false },
      { id: uuidv4(), username: 'bob', email: 'bob@example.com', fullName: 'Bob Baker', bio: 'Travel photographer.', isPrivate: false },
      { id: uuidv4(), username: 'carol', email: 'carol@example.com', fullName: 'Carol Chen', bio: 'Private account for testing.', isPrivate: true },
      { id: uuidv4(), username: 'dave', email: 'dave@example.com', fullName: 'Dave Diaz', bio: 'Foodie.', isPrivate: false },
      { id: uuidv4(), username: 'erin', email: 'erin@example.com', fullName: 'Erin Evans', bio: 'Runner. Dreamer.', isPrivate: false },
    ];

    await queryInterface.bulkInsert(
      'users',
      users.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        password_hash: passwordHash,
        full_name: u.fullName,
        bio: u.bio,
        is_private: u.isPrivate,
        is_verified_email: true,
        is_active: true,
        created_at: now,
        updated_at: now,
      }))
    );

    const [alice, bob, carol, dave, erin] = users;

    const posts = [
      { id: uuidv4(), userId: alice.id, caption: 'Morning brew #coffee #mood', type: 'image' },
      { id: uuidv4(), userId: bob.id, caption: 'Sunset over the bay #travel #sunset', type: 'image' },
      { id: uuidv4(), userId: dave.id, caption: 'Homemade pasta night #food', type: 'image' },
      { id: uuidv4(), userId: erin.id, caption: 'Long run today #running #fitness', type: 'image' },
    ];

    await queryInterface.bulkInsert(
      'posts',
      posts.map((p) => ({
        id: p.id,
        user_id: p.userId,
        type: p.type,
        caption: p.caption,
        like_count: 0,
        comment_count: 0,
        is_comments_disabled: false,
        created_at: now,
        updated_at: now,
      }))
    );

    await queryInterface.bulkInsert(
      'post_media',
      posts.map((p, idx) => ({
        id: uuidv4(),
        post_id: p.id,
        media_url: `https://picsum.photos/seed/demo-${idx}/800/800`,
        public_id: `demo/seed-${idx}`,
        media_type: 'image',
        position: 0,
        created_at: now,
        updated_at: now,
      }))
    );

    const tags = Array.from(
      new Set(
        posts.flatMap((p) => (p.caption.match(/#([a-zA-Z0-9_]+)/g) || []).map((t) => t.slice(1).toLowerCase()))
      )
    );

    const hashtagRows = tags.map((tag) => ({ id: uuidv4(), tag, created_at: now, updated_at: now }));
    if (hashtagRows.length > 0) {
      await queryInterface.bulkInsert('hashtags', hashtagRows);
    }

    const postHashtagRows = [];
    posts.forEach((p) => {
      const postTags = (p.caption.match(/#([a-zA-Z0-9_]+)/g) || []).map((t) => t.slice(1).toLowerCase());
      postTags.forEach((tag) => {
        const hashtagRow = hashtagRows.find((h) => h.tag === tag);
        if (hashtagRow) {
          postHashtagRows.push({
            post_id: p.id,
            hashtag_id: hashtagRow.id,
            created_at: now,
            updated_at: now,
          });
        }
      });
    });
    if (postHashtagRows.length > 0) {
      await queryInterface.bulkInsert('post_hashtags', postHashtagRows);
    }

    await queryInterface.bulkInsert('follows', [
      { id: uuidv4(), follower_id: alice.id, following_id: bob.id, status: 'accepted', created_at: now, updated_at: now },
      { id: uuidv4(), follower_id: alice.id, following_id: dave.id, status: 'accepted', created_at: now, updated_at: now },
      { id: uuidv4(), follower_id: bob.id, following_id: alice.id, status: 'accepted', created_at: now, updated_at: now },
      { id: uuidv4(), follower_id: dave.id, following_id: alice.id, status: 'accepted', created_at: now, updated_at: now },
      { id: uuidv4(), follower_id: erin.id, following_id: alice.id, status: 'accepted', created_at: now, updated_at: now },
      { id: uuidv4(), follower_id: bob.id, following_id: carol.id, status: 'pending', created_at: now, updated_at: now },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('follows', null, {});
    await queryInterface.bulkDelete('post_hashtags', null, {});
    await queryInterface.bulkDelete('hashtags', null, {});
    await queryInterface.bulkDelete('post_media', null, {});
    await queryInterface.bulkDelete('posts', null, {});
    await queryInterface.bulkDelete('users', null, {});
  },
};
