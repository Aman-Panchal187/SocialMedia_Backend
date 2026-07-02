'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('saves', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      post_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'posts', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('saves', ['user_id', 'post_id'], { unique: true, name: 'saves_user_id_post_id_unique' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('saves');
  },
};
