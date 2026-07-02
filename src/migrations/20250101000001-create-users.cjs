'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      username: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      email: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      password_hash: { type: Sequelize.STRING, allowNull: false },
      full_name: { type: Sequelize.STRING(100), allowNull: true },
      bio: { type: Sequelize.STRING(150), allowNull: true },
      avatar_url: { type: Sequelize.STRING, allowNull: true },
      avatar_public_id: { type: Sequelize.STRING, allowNull: true },
      is_private: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      is_verified_email: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      last_seen_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('users', ['username'], { unique: true, name: 'users_username_unique' });
    await queryInterface.addIndex('users', ['email'], { unique: true, name: 'users_email_unique' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  },
};
