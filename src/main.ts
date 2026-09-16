import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
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

  // Security & Optimization Middleware
  app.use(helmet());
  app.use(compression());

  // CORS
  app.enableCors({
    origin: (requestOrigin, callback) => {
      if (
        !requestOrigin ||
        requestOrigin === frontendUrl ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin)
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'stripe-signature'],
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

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'AURA Edinburgh API Documentation',
    customCss: `
      .swagger-ui .topbar { background-color: #08090c; border-bottom: 2px solid #c5a059; }
      .swagger-ui .topbar-wrapper .link { color: #f5eed8; }
    `,
  });

  await app.listen(port);
  logger.log(`AURA API Server listening at http://localhost:${port}/${apiPrefix}`);
  logger.log(`Swagger OpenAPI documentation at http://localhost:${port}/api/docs`);
}

bootstrap();
