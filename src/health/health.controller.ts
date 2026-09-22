import { Controller, Get, HttpCode, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { PrismaService } from '@/database/prisma.service';
import { RedisService } from '@/modules/redis/redis.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService, private readonly redis: RedisService) {}

  @Public()
  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'Process health check probe' })
  health() {
    return { status: 'ok' };
  }

  @Public()
  @Get('live')
  @HttpCode(200)
  @ApiOperation({ summary: 'Process liveness probe' })
  live() {
    return { status: 'ok' };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Database and cache readiness probe' })
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const redisHealthy = await this.redis.isHealthy();
      if (process.env.NODE_ENV === 'production' && !redisHealthy) {
        throw new Error('Redis is not ready');
      }
      return { status: 'ok', dependencies: { database: 'ok', redis: redisHealthy ? 'ok' : 'degraded' } };
    } catch {
      throw new ServiceUnavailableException({ status: 'not_ready' });
    }
  }
}
