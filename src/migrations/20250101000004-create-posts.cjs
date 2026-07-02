'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('posts', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      type: { type: Sequelize.ENUM('image', 'video', 'carousel'), allowNull: false },
      caption: { type: Sequelize.TEXT, allowNull: true },
      location: { type: Sequelize.STRING, allowNull: true },
      like_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      comment_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      is_comments_disabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('posts', ['user_id', 'created_at'], { name: 'posts_user_id_created_at_idx' });
    await queryInterface.addIndex('posts', ['created_at'], { name: 'posts_created_at_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('posts');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_posts_type";');
  },
};
