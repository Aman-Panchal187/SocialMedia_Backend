'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('story_views', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      story_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'stories', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      viewer_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      viewed_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('story_views', ['story_id', 'viewer_id'], {
      unique: true,
      name: 'story_views_story_id_viewer_id_unique',
    });

    await queryInterface.createTable('story_reactions', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      story_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'stories', key: 'id' },
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
      reaction_emoji: { type: Sequelize.STRING, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('story_reactions');
    await queryInterface.dropTable('story_views');
  },
};
