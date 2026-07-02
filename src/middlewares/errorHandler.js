import ApiError from '../utils/ApiError.js';
import logger from '../config/logger.js';
import env from '../config/env.js';

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      error = ApiError.conflict('Resource already exists');
    } else if (error.name === 'SequelizeValidationError') {
      error = ApiError.badRequest(
        'Validation failed',
        error.errors?.map((e) => ({ field: e.path, message: e.message }))
      );
    } else if (error.name === 'SequelizeForeignKeyConstraintError') {
      error = ApiError.badRequest('Invalid reference to related resource');
    } else if (error.type === 'entity.too.large' || error.code === 'LIMIT_FILE_SIZE') {
      error = ApiError.badRequest('Uploaded file exceeds the maximum allowed size');
    } else {
      error = ApiError.internal(env.isProduction ? 'Internal server error' : error.message);
    }
  }

  if (error.statusCode >= 500) {
    logger.error(err.stack || err.message);
  } else {
    logger.warn(`${error.code}: ${error.message}`);
  }

  res.status(error.statusCode).json({
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    },
  });
};

export default errorHandler;
