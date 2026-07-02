'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('post_media', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      post_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'posts', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      media_url: { type: Sequelize.STRING, allowNull: false },
      public_id: { type: Sequelize.STRING, allowNull: false },
      media_type: { type: Sequelize.ENUM('image', 'video'), allowNull: false },
      position: { type: Sequelize.SMALLINT, allowNull: false, defaultValue: 0 },
      width: { type: Sequelize.INTEGER, allowNull: true },
      height: { type: Sequelize.INTEGER, allowNull: true },
      duration_sec: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('post_media', ['post_id', 'position'], { name: 'post_media_post_id_position_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('post_media');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_post_media_media_type";');
  },
};
