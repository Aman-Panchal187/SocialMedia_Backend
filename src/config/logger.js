import path from 'path';
import { fileURLToPath } from 'url';
import winston from 'winston';
import env from './env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.resolve(__dirname, '../../logs');

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack }) => `${ts} [${level}]: ${stack || message}`)
);

const logger = winston.createLogger({
  level: env.isProduction ? 'info' : 'debug',
  format: combine(timestamp(), errors({ stack: true }), json()),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
    }),
  ],
  exitOnError: false,
});

if (!env.isTest) {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

export default logger;
