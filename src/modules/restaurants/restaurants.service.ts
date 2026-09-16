import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { RedisService } from '@/modules/redis/redis.service';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

@Injectable()
export class RestaurantsService {
  private readonly CACHE_KEY = 'aura:restaurant:info';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getInfo() {
    const cached = await this.redis.get<any>(this.CACHE_KEY);
    if (cached) return cached;

    let restaurant = await this.prisma.restaurant.findFirst();

    if (!restaurant) {
      // Create default if none exists yet
      restaurant = await this.prisma.restaurant.create({
        data: {
          name: 'AURA Edinburgh',
          slug: 'aura-edinburgh',
          stars: 'Two Michelin Stars',
          chefPatron: 'Euan Macleod',
          headSommelier: 'Fiona Sinclair',
          address: '14–16 Royal Terrace Vaults, Edinburgh, EH7 5TB, Scotland',
          phone: '+44 (0)131 556 8920',
          email: 'reservations@aura-edinburgh.com',
          maxCapacity: 28,
          openingHours: [
            { days: 'Wednesday – Saturday', service: 'Dinner', times: '17:30 – 23:00', lastSitting: '20:30' },
            { days: 'Friday & Saturday', service: 'Lunch', times: '12:00 – 14:30', lastSitting: '13:15' },
            { days: 'Sunday', service: 'Sunday Supper Tasting', times: '17:00 – 22:00', lastSitting: '19:45' },
            { days: 'Monday & Tuesday', service: 'Closed', times: 'Foraging & Cellar Expeditions', lastSitting: '-' },
          ],
          coordinates: { lat: 55.9575, lng: -3.1818 },
        },
      });
    }

    await this.redis.set(this.CACHE_KEY, restaurant, 60 * 60); // 1 hour cache
    return restaurant;
  }

  async update(dto: UpdateRestaurantDto) {
    const restaurant = await this.getInfo();

    const updated = await this.prisma.restaurant.update({
      where: { id: restaurant.id },
      data: dto,
    });

    await this.redis.del(this.CACHE_KEY);
    return updated;
  }
}
