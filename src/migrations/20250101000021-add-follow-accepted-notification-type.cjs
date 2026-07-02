'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      "ALTER TYPE \"enum_notifications_type\" ADD VALUE IF NOT EXISTS 'follow_accepted';"
    );
  },

  async down() {
    // Postgres does not support removing a value from an enum type; intentionally a no-op.
  },
};
