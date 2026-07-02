'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('comment_likes', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      comment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'comments', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('comment_likes', ['user_id', 'comment_id'], {
      unique: true,
      name: 'comment_likes_user_id_comment_id_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('comment_likes');
  },
};
