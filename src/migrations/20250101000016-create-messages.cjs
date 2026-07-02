'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('messages', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      conversation_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'conversations', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      sender_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      content_type: { type: Sequelize.ENUM('text', 'image', 'video', 'file'), allowNull: false },
      content: { type: Sequelize.TEXT, allowNull: true },
      media_url: { type: Sequelize.STRING, allowNull: true },
      public_id: { type: Sequelize.STRING, allowNull: true },
      status: { type: Sequelize.ENUM('sent', 'delivered', 'read'), allowNull: false, defaultValue: 'sent' },
      reply_to_story_id: { type: Sequelize.UUID, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('messages', ['conversation_id', 'created_at'], {
      name: 'messages_conversation_id_created_at_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('messages');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_messages_content_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_messages_status";');
  },
};
