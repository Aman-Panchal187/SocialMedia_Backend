'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('stories', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      media_url: { type: Sequelize.STRING, allowNull: false },
      public_id: { type: Sequelize.STRING, allowNull: false },
      media_type: { type: Sequelize.ENUM('image', 'video'), allowNull: false },
      caption: { type: Sequelize.STRING, allowNull: true },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      view_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('stories', ['user_id', 'expires_at'], { name: 'stories_user_id_expires_at_idx' });
    await queryInterface.addIndex('stories', ['expires_at'], { name: 'stories_expires_at_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('stories');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_stories_media_type";');
  },
};
