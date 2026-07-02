import { Sequelize } from 'sequelize';
import env from './env.js';
import logger from './logger.js';

const sequelizeLogging = (msg) => logger.debug(msg);

const sequelize = env.databaseUrl
  ? new Sequelize(env.databaseUrl, {
      dialect: 'postgres',
      logging: env.isProduction ? false : sequelizeLogging,
    })
  : new Sequelize(env.pg.database, env.pg.user, env.pg.password, {
      host: env.pg.host,
      port: env.pg.port,
      dialect: 'postgres',
      logging: env.isProduction ? false : sequelizeLogging,
    });

export const connectDatabase = async () => {
  await sequelize.authenticate();
  logger.info(`Database connection established (${env.nodeEnv})`);
};

export default sequelize;
