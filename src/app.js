import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import hpp from 'hpp';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import env from './config/env.js';
import logger from './config/logger.js';
import swaggerSpec from './config/swagger.js';
import { apiRateLimiter } from './middlewares/rateLimiter.js';
import notFound from './middlewares/notFound.js';
import errorHandler from './middlewares/errorHandler.js';

import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import postsRoutes from './modules/posts/posts.routes.js';
import followRoutes from './modules/follow/follow.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import chatRoutes from './modules/chat/chat.routes.js';
import storiesRoutes from './modules/stories/stories.routes.js';
import callsRoutes from './modules/calls/calls.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';
import searchRoutes from './modules/search/search.routes.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  })
);
app.use(hpp());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser(env.cookieSecret));

const morganStream = { write: (message) => logger.http(message.trim()) };
if (!env.isTest) {
  app.use(morgan(env.isProduction ? 'combined' : 'dev', { stream: morganStream }));
}

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, data: { status: 'ok' }, message: null });
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const apiRouter = express.Router();
apiRouter.use(apiRateLimiter);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', usersRoutes);
apiRouter.use('/posts', postsRoutes);
apiRouter.use('/follow', followRoutes);
apiRouter.use('/notifications', notificationsRoutes);
apiRouter.use('/chat', chatRoutes);
apiRouter.use('/stories', storiesRoutes);
apiRouter.use('/calls', callsRoutes);
apiRouter.use('/ai', aiRoutes);
apiRouter.use('/search', searchRoutes);

app.use('/api/v1', apiRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
