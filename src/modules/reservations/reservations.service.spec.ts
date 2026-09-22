import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsService } from './reservations.service';
import { PrismaService } from '@/database/prisma.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { ConfigService } from '@nestjs/config';

describe('ReservationsService', () => {
  let service: ReservationsService;

  const mockPrisma = {
    reservation: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };

  const mockNotifications = {
    sendReservationConfirmation: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: ConfigService, useValue: { get: jest.fn((_key: string, fallback: unknown) => fallback) } },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should indicate closed on Monday', async () => {
    // 2026-10-12 is a Monday
    const result = await service.checkAvailability({
      date: '2026-10-12',
      guests: 2,
    });

    expect(result.isAvailable).toBe(false);
    expect(result.message).toContain('closed on Mondays & Tuesdays');
  });

  it('should calculate availability on Wednesday', async () => {
    // 2026-10-14 is a Wednesday
    const result = await service.checkAvailability({
      date: '2026-10-14',
      guests: 2,
    });

    expect(result.isAvailable).toBe(true);
    expect(result.dinnerSlots.length).toBeGreaterThan(0);
    expect(result.dinnerSlots[0].status).toBe('Available');
  });
});
