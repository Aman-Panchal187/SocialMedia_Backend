'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('refresh_tokens', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      token_hash: { type: Sequelize.STRING, allowNull: false },
      device_info: { type: Sequelize.STRING, allowNull: true },
      ip_address: { type: Sequelize.STRING, allowNull: true },
      is_revoked: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('refresh_tokens', ['user_id', 'is_revoked'], {
      name: 'refresh_tokens_user_id_is_revoked_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('refresh_tokens');
  },
};
