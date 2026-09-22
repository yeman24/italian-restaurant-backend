export interface EnvironmentVariables {
  port: number;
  nodeEnv: string;
  isProduction: boolean;
  apiPrefix: string;
  frontendUrl: string;
  restaurantTimezone: string;
  reservationHorizonDays: number;
  reservationPolicyVersion: string;
  depositRequired: boolean;
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
    alertEmail: string;
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
  isProduction: process.env.NODE_ENV === 'production',
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  frontendUrl: process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173'),
  restaurantTimezone: process.env.RESTAURANT_TIMEZONE || 'Europe/London',
  reservationHorizonDays: parseInt(process.env.RESERVATION_HORIZON_DAYS || '90', 10),
  reservationPolicyVersion: process.env.RESERVATION_POLICY_VERSION || '2026-01',
  depositRequired: process.env.DEPOSIT_REQUIRED === 'true',
  databaseUrl: process.env.DATABASE_URL || (process.env.NODE_ENV === 'production' ? '' : 'postgresql://aura:aura_secret@localhost:5432/aura_edinburgh?schema=public'),
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'aura_dev_access_secret'),
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'aura_dev_refresh_secret'),
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
    fromEmail: process.env.RESEND_FROM_EMAIL || 'concierge@aura-edinburgh.com',
    alertEmail: process.env.RESEND_ALERT_EMAIL || '',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || undefined,
    model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  },
});
