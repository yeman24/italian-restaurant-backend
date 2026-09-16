import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '@/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockJwt = {
    signAsync: jest.fn().mockResolvedValue('mock_access_token'),
  };

  const mockConfig = {
    get: jest.fn((key: string, defaultVal: any) => defaultVal),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw ConflictException if registering duplicate email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-id' });

    await expect(
      service.register({
        email: 'duplicate@aura-edinburgh.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
