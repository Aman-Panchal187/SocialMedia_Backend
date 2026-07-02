'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('comments', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      post_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'posts', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      parent_comment_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'comments', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      content: { type: Sequelize.STRING(2200), allowNull: false },
      like_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('comments', ['post_id', 'parent_comment_id', 'created_at'], {
      name: 'comments_post_id_parent_comment_id_created_at_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('comments');
  },
};
