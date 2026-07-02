import cron from 'node-cron';
import logger from '../config/logger.js';
import { destroyCloudinaryAsset } from '../config/cloudinary.js';
import * as storiesRepo from '../modules/stories/stories.repository.js';

const EXPIRED_STORIES_BATCH_SIZE = 200;

const registerStoryExpiryJob = () => {
  cron.schedule('*/15 * * * *', async () => {
    try {
      const expiredStories = await storiesRepo.findExpiredStories(EXPIRED_STORIES_BATCH_SIZE);
      let deletedCount = 0;

      for (const story of expiredStories) {
        try {
          await destroyCloudinaryAsset(story.publicId, {
            resource_type: story.mediaType === 'video' ? 'video' : 'image',
          });
          await storiesRepo.destroyStory(story);
          deletedCount += 1;
        } catch (err) {
          logger.error(`storyExpiry.job: failed to expire story ${story.id}: ${err.message}`);
        }
      }

      if (deletedCount > 0) {
        logger.info(`storyExpiry.job: expired ${deletedCount} story rows`);
      }
    } catch (err) {
      logger.error(`storyExpiry.job failed: ${err.message}`);
    }
  });
};

export default registerStoryExpiryJob;
