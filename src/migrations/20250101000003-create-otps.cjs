'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('otps', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      email: { type: Sequelize.STRING, allowNull: false },
      code_hash: { type: Sequelize.STRING, allowNull: false },
      purpose: { type: Sequelize.ENUM('email_verify', 'password_reset'), allowNull: false },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      consumed_at: { type: Sequelize.DATE, allowNull: true },
      attempt_count: { type: Sequelize.SMALLINT, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('otps', ['email', 'purpose', 'consumed_at'], {
      name: 'otps_email_purpose_consumed_at_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('otps');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_otps_purpose";');
  },
};
