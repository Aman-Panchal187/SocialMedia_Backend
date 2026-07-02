import ApiError from '../utils/ApiError.js';

const authorizeOwner = (getOwnerId) => async (req, res, next) => {
  try {
    const ownerId = await getOwnerId(req);
    if (!ownerId || ownerId !== req.user.id) {
      throw ApiError.forbidden('You do not have permission to perform this action');
    }
    next();
  } catch (err) {
    next(err);
  }
};

export default authorizeOwner;
