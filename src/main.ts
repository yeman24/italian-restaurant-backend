import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Needed for Stripe webhook signature verification
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 4000);
  const apiPrefix = configService.get<string>('apiPrefix', 'api/v1');
  const frontendUrl = configService.get<string>('frontendUrl', 'http://localhost:5173');
  const nodeEnv = configService.get<string>('nodeEnv', 'development');

  app.enableShutdownHooks();
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  if (nodeEnv === 'production') {
    const requiredConfig = [
      ['JWT_ACCESS_SECRET', configService.get<string>('jwt.accessSecret')],
      ['JWT_REFRESH_SECRET', configService.get<string>('jwt.refreshSecret')],
      ['DATABASE_URL', configService.get<string>('databaseUrl')],
      ['FRONTEND_URL', configService.get<string>('frontendUrl')],
      ['RESEND_API_KEY', configService.get<string>('resend.apiKey')],
      ['RESEND_ALERT_EMAIL', configService.get<string>('resend.alertEmail')],
      ['CLOUDINARY_CLOUD_NAME', configService.get<string>('cloudinary.cloudName')],
      ['CLOUDINARY_API_KEY', configService.get<string>('cloudinary.apiKey')],
      ['CLOUDINARY_API_SECRET', configService.get<string>('cloudinary.apiSecret')],
    ];
    if (configService.get<boolean>('depositRequired')) {
      requiredConfig.push(
        ['STRIPE_SECRET_KEY', configService.get<string>('stripe.secretKey')],
        ['STRIPE_WEBHOOK_SECRET', configService.get<string>('stripe.webhookSecret')],
      );
    }
    const missingConfig = requiredConfig.filter(([, value]) => !value).map(([name]) => name);
    if (missingConfig.length > 0) {
      throw new Error(`Missing required production configuration: ${missingConfig.join(', ')}`);
    }
  }

  // Security & Optimization Middleware
  app.use(helmet());
  app.use(compression());
  const parseCookies = typeof cookieParser === 'function' ? cookieParser : (cookieParser as any)?.default;
  if (typeof parseCookies === 'function') {
    app.use(parseCookies());
  }

  // CORS
  app.enableCors({
    origin: (requestOrigin, callback) => {
      if (
        !requestOrigin ||
        requestOrigin === frontendUrl ||
        (nodeEnv !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin))
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'stripe-signature'],
  });

  // Cookie-authenticated mutations must originate from the configured web app.
  // SameSite cookies are an additional browser control; this protects deployments
  // where a proxy or embedded client changes cookie behavior.
  app.use((request, response, next) => {
    const mutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
    const isStripeWebhook = request.path === `/${apiPrefix}/payments/webhook`;
    const requestOrigin = request.get('origin');
    const localOrigin = nodeEnv !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin || '');

    if (mutation && !isStripeWebhook && requestOrigin && requestOrigin !== frontendUrl && !localOrigin) {
      return response.status(403).json({ statusCode: 403, message: 'Request origin is not allowed' });
    }

    next();
  });

  // Global API Prefix
  app.setGlobalPrefix(apiPrefix);

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger Documentation Setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('AURA Edinburgh | Fine Dining API')
    .setDescription(
      'Enterprise RESTful API for AURA Edinburgh (2 Michelin Stars). Features Tasting Menus, Reservations Engine, Wine Cellar, Stripe Payments, and Administration.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'Customer & Staff authentication and token rotation')
    .addTag('Menu', 'Dishes, tasting menus, Scottish provenance, and wine pairings')
    .addTag('Reservations', 'Table availability check and booking wizard')
    .addTag('Payments & Deposits', 'Stripe payment intent generation & webhooks')
    .addTag('Admin Dashboard', 'Executive revenue, covers, and occupancy analytics')
    .addTag('Gallery', 'Photographic curation and Cloudinary media management')
    .addTag('Contact & Inquiries', 'Concierge messaging, private dining & gazette')
    .build();

  if (nodeEnv !== 'production') {
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'AURA Edinburgh API Documentation',
      customCss: `
        .swagger-ui .topbar { background-color: #08090c; border-bottom: 2px solid #c5a059; }
        .swagger-ui .topbar-wrapper .link { color: #f5eed8; }
      `,
    });
  }

  await app.listen(port, () => {
    console.log(`Backend is running on port http://localhost:${port} `);
  });
  logger.log(`AURA API Server listening at http://localhost:${port}/${apiPrefix}`);
  if (nodeEnv !== 'production') {
    logger.log(`Swagger OpenAPI documentation at http://localhost:${port}/api/docs`);
  }
}

bootstrap().catch((error) => {
  new Logger('Bootstrap').error(`Application failed to start: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
