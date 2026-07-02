import db from '../../src/models/index.js';

// Integration tests run against a real Postgres test database (NODE_ENV=test
// switches src/config/database.js to DATABASE_URL_TEST / *_test). Migrations
// remain the source of truth for schema in every real environment; sync() is
// used only here, as a test-harness convenience, to materialize that same
// schema from the models without requiring a migration run step in CI.
export const setupTestDatabase = async () => {
  await db.sequelize.sync({ force: true });
};

export const teardownTestDatabase = async () => {
  await db.sequelize.close();
};

export const clearTestDatabase = async () => {
  const tableNames = Object.values(db)
    .filter((model) => model?.getTableName)
    .map((model) => model.getTableName());
  for (const tableName of tableNames) {
    await db.sequelize.query(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;`);
  }
};

export default db;
