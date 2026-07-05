require('dotenv').config();

const dialectOptions =
  process.env.DB_SSL === 'true' ? { ssl: { require: true, rejectUnauthorized: false } } : {};

function buildConfig(databaseUrl, discreteDb) {
  if (databaseUrl) {
    return {
      use_env_variable: null,
      url: databaseUrl,
      dialect: 'postgres',
      logging: false,
      dialectOptions,
    };
  }
  return {
    username: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: discreteDb,
    host: process.env.PGHOST,
    port: process.env.PGPORT || 5432,
    dialect: 'postgres',
    logging: false,
    dialectOptions,
  };
}

module.exports = {
  development: buildConfig(process.env.DATABASE_URL, process.env.PGDATABASE),
  test: buildConfig(process.env.DATABASE_URL_TEST, `${process.env.PGDATABASE || 'photosphere'}_test`),
  production: buildConfig(process.env.DATABASE_URL, process.env.PGDATABASE),
};
