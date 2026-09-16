import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error', 'warn'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Prisma connected to database successfully.');
    } catch (error) {
      this.logger.warn(`Database connection deferred or offline: ${(error as Error).message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma disconnected from database.');
  }
}
