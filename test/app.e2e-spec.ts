import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from '@/app.module';
import { PrismaService } from '@/database/prisma.service';
import { RedisService } from '@/modules/redis/redis.service';

describe('AURA API (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Keep the contract tests independent of a developer's local database or Redis.
    // Database-backed integration tests should run in the deployment pipeline against
    // disposable services; these tests verify the HTTP/security boundary itself.
    process.env.DATABASE_URL = 'postgresql://e2e:e2e@localhost:5432/e2e';
    const prismaMock = {
      restaurant: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'restaurant-e2e',
          name: 'AURA Edinburgh',
          slug: 'aura-edinburgh',
        }),
      },
      reservation: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const redisMock = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      isHealthy: jest.fn().mockResolvedValue(true),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(RedisService)
      .useValue(redisMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/api/v1/restaurants/info (GET) should return restaurant profile', () => {
    return request(app.getHttpServer())
      .get('/api/v1/restaurants/info')
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe('AURA Edinburgh');
      });
  });

  it('/api/v1/reservations/availability (GET) should calculate slots', () => {
    return request(app.getHttpServer())
      .get('/api/v1/reservations/availability?date=2026-10-14&guests=2')
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.data.isAvailable).toBe(true);
      });
  });

  it('/api/v1/admin/dashboard/stats (GET) should reject unauthenticated access', () => {
    return request(app.getHttpServer())
      .get('/api/v1/admin/dashboard/stats')
      .expect(401);
  });

  it('/api/v1/reservations (POST) should require explicit policy acceptance and idempotency', () => {
    return request(app.getHttpServer())
      .post('/api/v1/reservations')
      .send({})
      .expect(400);
  });
});
