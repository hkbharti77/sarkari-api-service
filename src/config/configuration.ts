export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 4000,
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/govjob_db',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    url: process.env.REDIS_URL || undefined,
    tls: process.env.REDIS_TLS === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'super_secret_jwt_key_govjob_2026_recruitment',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : ['http://localhost:5173', 'http://localhost:3000'],
  },
});
