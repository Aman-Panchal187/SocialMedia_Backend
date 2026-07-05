import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const envSchema = Joi.object({
  PORT: Joi.number().default(5000),
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),

  DATABASE_URL: Joi.string().allow('').optional(),
  DATABASE_URL_TEST: Joi.string().allow('').optional(),
  DB_SSL: Joi.boolean().default(false),
  PGHOST: Joi.string().allow('').optional(),
  PGPORT: Joi.alternatives().try(Joi.number(), Joi.string().valid('')).optional(),
  PGDATABASE: Joi.string().allow('').optional(),
  PGUSER: Joi.string().allow('').optional(),
  PGPASSWORD: Joi.string().allow('').optional(),

  JWT_ACCESS_SECRET: Joi.string().min(8).required(),
  JWT_REFRESH_SECRET: Joi.string().min(8).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  CORS_ORIGIN: Joi.string().default('http://localhost:5173'),

  CLOUDINARY_CLOUD_NAME: Joi.string().allow('').optional(),
  CLOUDINARY_API_KEY: Joi.string().allow('').optional(),
  CLOUDINARY_API_SECRET: Joi.string().allow('').optional(),

  SMTP_HOST: Joi.string().allow('').optional(),
  SMTP_PORT: Joi.alternatives().try(Joi.number(), Joi.string().valid('')).optional(),
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASS: Joi.string().allow('').optional(),

  // Brevo's transactional email HTTP API (preferred over SMTP) — plain
  // HTTPS on port 443, so it isn't affected by hosts that block outbound
  // SMTP ports the way several free-tier PaaS providers do.
  BREVO_API_KEY: Joi.string().allow('').optional(),
  BREVO_SENDER_EMAIL: Joi.string().allow('').optional(),

  COOKIE_SECRET: Joi.string().min(8).required(),

  HUGGINGFACE_API_KEY: Joi.string().allow('').optional(),
})
  .or('DATABASE_URL', 'PGHOST')
  .unknown(true);

const { error, value: validatedEnv } = envSchema.validate(process.env, {
  abortEarly: false,
});

if (error) {
  // eslint-disable-next-line no-console
  console.error(
    `Environment validation failed:\n${error.details.map((d) => ` - ${d.message}`).join('\n')}`
  );
  process.exit(1);
}

const isTest = validatedEnv.NODE_ENV === 'test';

const env = {
  port: validatedEnv.PORT,
  nodeEnv: validatedEnv.NODE_ENV,
  isProduction: validatedEnv.NODE_ENV === 'production',
  isTest,

  databaseUrl: isTest ? validatedEnv.DATABASE_URL_TEST : validatedEnv.DATABASE_URL,
  // Managed Postgres providers commonly used for free hosting (Neon,
  // Supabase, etc.) require SSL and typically present a cert chain Node
  // won't validate by default — rejectUnauthorized:false is the standard
  // escape hatch recommended by those providers themselves.
  dbSsl: validatedEnv.DB_SSL,
  pg: {
    host: validatedEnv.PGHOST,
    port: validatedEnv.PGPORT || 5432,
    database: isTest
      ? `${validatedEnv.PGDATABASE || 'photosphere'}_test`
      : validatedEnv.PGDATABASE,
    user: validatedEnv.PGUSER,
    password: validatedEnv.PGPASSWORD,
  },

  jwt: {
    accessSecret: validatedEnv.JWT_ACCESS_SECRET,
    refreshSecret: validatedEnv.JWT_REFRESH_SECRET,
    accessExpiresIn: validatedEnv.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: validatedEnv.JWT_REFRESH_EXPIRES_IN,
  },

  corsOrigin: validatedEnv.CORS_ORIGIN,

  cloudinary: {
    cloudName: validatedEnv.CLOUDINARY_CLOUD_NAME,
    apiKey: validatedEnv.CLOUDINARY_API_KEY,
    apiSecret: validatedEnv.CLOUDINARY_API_SECRET,
  },

  smtp: {
    host: validatedEnv.SMTP_HOST,
    port: validatedEnv.SMTP_PORT,
    user: validatedEnv.SMTP_USER,
    pass: validatedEnv.SMTP_PASS,
  },

  brevo: {
    apiKey: validatedEnv.BREVO_API_KEY || '',
    senderEmail: validatedEnv.BREVO_SENDER_EMAIL || '',
  },

  cookieSecret: validatedEnv.COOKIE_SECRET,

  huggingFace: {
    apiKey: validatedEnv.HUGGINGFACE_API_KEY || '',
  },
};

export default env;
