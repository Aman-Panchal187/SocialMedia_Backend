'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notifications', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      recipient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      actor_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM(
          'like',
          'comment',
          'reply',
          'follow',
          'follow_request',
          'story_reaction',
          'story_reply',
          'message'
        ),
        allowNull: false,
      },
      entity_type: { type: Sequelize.STRING, allowNull: true },
      entity_id: { type: Sequelize.UUID, allowNull: true },
      is_read: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('notifications', ['recipient_id', 'is_read', 'created_at'], {
      name: 'notifications_recipient_id_is_read_created_at_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('notifications');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_notifications_type";');
  },
};
