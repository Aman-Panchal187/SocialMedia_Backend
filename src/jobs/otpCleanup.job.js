import cron from 'node-cron';
import { Op } from 'sequelize';
import db from '../models/index.js';
import logger from '../config/logger.js';

const registerOtpCleanupJob = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      const deletedCount = await db.Otp.destroy({
        where: {
          [Op.or]: [{ expiresAt: { [Op.lt]: new Date() } }, { consumedAt: { [Op.ne]: null } }],
        },
      });
      if (deletedCount > 0) {
        logger.info(`otpCleanup.job: purged ${deletedCount} expired/consumed OTP rows`);
      }
    } catch (err) {
      logger.error(`otpCleanup.job failed: ${err.message}`);
    }
  });
};

export default registerOtpCleanupJob;
