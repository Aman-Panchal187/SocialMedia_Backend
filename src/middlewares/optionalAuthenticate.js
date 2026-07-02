import { verifyAccessToken } from '../utils/tokenUtils.js';

// Used on public routes that alter their response when the caller happens to
// be authenticated (e.g. profile/post visibility, follow-state flags) without
// requiring a token to be present at all.
const optionalAuthenticate = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme === 'Bearer' && token) {
    try {
      const payload = verifyAccessToken(token);
      req.user = { id: payload.userId };
    } catch {
      req.user = undefined;
    }
  }

  next();
};

export default optionalAuthenticate;
