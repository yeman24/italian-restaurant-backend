import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class CellarService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.cellarItem.findMany({
      orderBy: [{ allocationStatus: 'asc' }, { name: 'asc' }],
    });
  }
}
