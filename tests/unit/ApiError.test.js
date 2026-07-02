import ApiError from '../../src/utils/ApiError.js';

describe('ApiError', () => {
  it('builds the correct status/code for each factory method', () => {
    expect(ApiError.badRequest('x')).toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
    expect(ApiError.unauthorized()).toMatchObject({ statusCode: 401, code: 'UNAUTHORIZED' });
    expect(ApiError.forbidden()).toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
    expect(ApiError.notFound()).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
    expect(ApiError.conflict()).toMatchObject({ statusCode: 409, code: 'CONFLICT' });
    expect(ApiError.rateLimited()).toMatchObject({ statusCode: 429, code: 'RATE_LIMITED' });
    expect(ApiError.internal()).toMatchObject({ statusCode: 500, code: 'INTERNAL_ERROR' });
  });

  it('carries optional details through', () => {
    const details = [{ field: 'email', message: 'required' }];
    const err = ApiError.badRequest('Validation failed', details);
    expect(err.details).toEqual(details);
  });
});
