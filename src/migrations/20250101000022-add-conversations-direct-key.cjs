'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('conversations', 'direct_key', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // Backfill a canonical "smaller-id:larger-id" key for every existing 1:1
    // conversation so duplicates created by the known startConversation race
    // condition can be detected and merged before the unique index goes on.
    await queryInterface.sequelize.query(`
      UPDATE conversations c
      SET direct_key = sub.key
      FROM (
        SELECT a.conversation_id,
               LEAST(a.user_id, b.user_id) || ':' || GREATEST(a.user_id, b.user_id) AS key
        FROM conversation_participants a
        JOIN conversation_participants b
          ON a.conversation_id = b.conversation_id AND a.user_id < b.user_id
      ) sub
      WHERE c.id = sub.conversation_id AND c.is_group = false;
    `);

    const [duplicateGroups] = await queryInterface.sequelize.query(`
      SELECT direct_key, array_agg(id ORDER BY created_at ASC) AS ids
      FROM conversations
      WHERE direct_key IS NOT NULL
      GROUP BY direct_key
      HAVING COUNT(*) > 1;
    `);

    for (const group of duplicateGroups) {
      const [keeperId, ...dupeIds] = group.ids;
      for (const dupeId of dupeIds) {
        await queryInterface.sequelize.query(
          'UPDATE messages SET conversation_id = :keeperId WHERE conversation_id = :dupeId',
          { replacements: { keeperId, dupeId } }
        );
        await queryInterface.sequelize.query(
          'DELETE FROM conversation_participants WHERE conversation_id = :dupeId',
          { replacements: { dupeId } }
        );
        await queryInterface.sequelize.query('DELETE FROM conversations WHERE id = :dupeId', {
          replacements: { dupeId },
        });
      }
    }

    await queryInterface.addIndex('conversations', ['direct_key'], {
      unique: true,
      name: 'conversations_direct_key_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('conversations', 'conversations_direct_key_unique');
    await queryInterface.removeColumn('conversations', 'direct_key');
  },
};
