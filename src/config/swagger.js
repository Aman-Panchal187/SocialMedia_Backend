import swaggerJSDoc from 'swagger-jsdoc';
import env from './env.js';

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'PhotoSphere API',
      version: '1.0.0',
      description: 'Phase 1 — Auth, Users, Posts, Follow',
    },
    servers: [{ url: `/api/v1` }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ApiSuccess: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            message: { type: 'string' },
          },
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [
    './src/modules/**/*.routes.js',
  ],
});

export default swaggerSpec;
export const isSwaggerEnabled = !env.isTest;
