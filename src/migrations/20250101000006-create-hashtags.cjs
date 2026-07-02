'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('hashtags', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tag: { type: Sequelize.STRING, allowNull: false, unique: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('hashtags', ['tag'], { unique: true, name: 'hashtags_tag_unique' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('hashtags');
  },
};
