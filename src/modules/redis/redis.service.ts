import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private readonly memoryCache = new Map<string, { value: string; expiresAt?: number }>();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);
    const password = this.configService.get<string>('redis.password');

    try {
      this.client = new Redis({
        host,
        port,
        password: password || undefined,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // Don't infinite loop if redis offline
      });

      this.client.on('error', (err) => {
        this.logger.warn(`Redis disconnected or unavailable: ${err.message}. Operating in in-memory cache mode.`);
        this.client = null;
      });

      await this.client.connect();
      this.logger.log(`Connected to Redis at ${host}:${port}`);
    } catch {
      this.logger.warn('Redis connection deferred. Using in-memory fallback cache.');
      this.client = null;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.client) {
      try {
        const data = await this.client.get(key);
        return data ? JSON.parse(data) : null;
      } catch {
        // Fall back to memory
      }
    }

    const item = this.memoryCache.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    return JSON.parse(item.value);
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (this.client) {
      try {
        if (ttlSeconds) {
          await this.client.set(key, serialized, 'EX', ttlSeconds);
        } else {
          await this.client.set(key, serialized);
        }
        return;
      } catch {
        // Fall back to memory
      }
    }

    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.memoryCache.set(key, { value: serialized, expiresAt });
  }

  async del(key: string): Promise<void> {
    if (this.client) {
      try {
        await this.client.del(key);
      } catch {
        // Fall back
      }
    }
    this.memoryCache.delete(key);
  }

  async delPattern(pattern: string): Promise<void> {
    if (this.client) {
      try {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } catch {
        // Fall back
      }
    }

    const regex = new RegExp(`^${pattern.replace('*', '.*')}$`);
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }
  }
}
