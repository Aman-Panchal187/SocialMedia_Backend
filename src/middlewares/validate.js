import ApiError from '../utils/ApiError.js';

const SOURCES = ['body', 'params', 'query'];

const validate = (schema) => (req, res, next) => {
  const errors = [];

  for (const source of SOURCES) {
    if (!schema[source]) continue;
    const { error, value } = schema[source].validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      errors.push(
        ...error.details.map((d) => ({
          field: d.path.join('.'),
          message: d.message,
          location: source,
        }))
      );
    } else {
      req[source] = value;
    }
  }

  if (errors.length > 0) {
    return next(ApiError.badRequest('Validation failed', errors));
  }

  return next();
};

export default validate;
