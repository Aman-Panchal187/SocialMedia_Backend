'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('follows', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      follower_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      following_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      status: { type: Sequelize.ENUM('pending', 'accepted'), allowNull: false, defaultValue: 'accepted' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('follows', ['follower_id', 'following_id'], {
      unique: true,
      name: 'follows_follower_id_following_id_unique',
    });
    await queryInterface.addIndex('follows', ['follower_id', 'status'], { name: 'follows_follower_id_status_idx' });
    await queryInterface.addIndex('follows', ['following_id', 'status'], { name: 'follows_following_id_status_idx' });
    await queryInterface.sequelize.query(
      'ALTER TABLE follows ADD CONSTRAINT follows_no_self_follow CHECK (follower_id <> following_id);'
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('follows');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_follows_status";');
  },
};
