'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('search_history', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      searched_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('search_history', ['user_id', 'searched_user_id'], {
      unique: true,
      name: 'search_history_user_id_searched_user_id_unique',
    });
    await queryInterface.addIndex('search_history', ['user_id', 'created_at'], {
      name: 'search_history_user_id_created_at_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('search_history');
  },
};
