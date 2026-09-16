export interface EnvironmentVariables {
  port: number;
  nodeEnv: string;
  apiPrefix: string;
  frontendUrl: string;
  databaseUrl: string;
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  jwt: {
    accessSecret: string;
    accessExpiration: string;
    refreshSecret: string;
    refreshExpiration: string;
  };
  stripe: {
    secretKey: string;
    webhookSecret: string;
  };
  resend: {
    apiKey: string;
    fromEmail: string;
  };
  cloudinary: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
  };
  gemini: {
    apiKey?: string;
    model: string;
  };
  throttle: {
    ttl: number;
    limit: number;
  };
}

export default (): EnvironmentVariables => ({
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://aura:aura_secret@localhost:5432/aura_db?schema=public',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'aura_default_access_secret_key',
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'aura_default_refresh_secret_key',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_mock',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock',
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY || 're_mock',
    fromEmail: process.env.RESEND_FROM_EMAIL || 'concierge@aura-edinburgh.com',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'aura',
    apiKey: process.env.CLOUDINARY_API_KEY || 'mock',
    apiSecret: process.env.CLOUDINARY_API_SECRET || 'mock',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || undefined,
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  },
});
