import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@/app.module';

describe('AURA API (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
});
