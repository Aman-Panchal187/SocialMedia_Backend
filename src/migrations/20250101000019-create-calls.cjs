'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('calls', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      caller_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      callee_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      call_type: { type: Sequelize.ENUM('voice', 'video'), allowNull: false },
      status: { type: Sequelize.ENUM('missed', 'completed', 'rejected', 'failed'), allowNull: false },
      started_at: { type: Sequelize.DATE, allowNull: true },
      ended_at: { type: Sequelize.DATE, allowNull: true },
      duration_sec: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('calls', ['caller_id', 'created_at'], { name: 'calls_caller_id_created_at_idx' });
    await queryInterface.addIndex('calls', ['callee_id', 'created_at'], { name: 'calls_callee_id_created_at_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('calls');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_calls_call_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_calls_status";');
  },
};
