import http from 'http';
import app from './app.js';
import env from './config/env.js';
import logger from './config/logger.js';
import { connectDatabase } from './config/database.js';
import { initSocket } from './config/socket.js';
import registerSocketHandlers from './sockets/index.js';
import registerStoryExpiryJob from './jobs/storyExpiry.job.js';
import registerOtpCleanupJob from './jobs/otpCleanup.job.js';

const httpServer = http.createServer(app);
const io = initSocket(httpServer);
registerSocketHandlers(io);

const start = async () => {
  try {
    await connectDatabase();

    registerStoryExpiryJob();
    registerOtpCleanupJob();

    httpServer.listen(env.port, () => {
      logger.info(`Server listening on port ${env.port} [${env.nodeEnv}]`);
      logger.info(`API docs available at http://localhost:${env.port}/api/docs`);
    });
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled rejection: ${reason instanceof Error ? reason.stack : reason}`);
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught exception: ${err.stack}`);
  process.exit(1);
});

start();

export default httpServer;
