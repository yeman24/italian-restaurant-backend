import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateReviewDto, userId?: string) {
    return this.prisma.review.create({
      data: {
        publication: dto.publication,
        author: dto.author,
        quote: dto.quote,
        rating: dto.rating,
        year: dto.year,
        badge: dto.badge,
        isApproved: dto.isApproved ?? true,
        isFeatured: dto.isFeatured ?? true,
        userId,
      },
    });
  }

  async findAllPublic() {
    return this.prisma.review.findMany({
      where: { isApproved: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllAdmin(pagination: PaginationDto) {
    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      }),
      this.prisma.review.count(),
    ]);

    return {
      data,
      meta: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
        hasNextPage: pagination.page * pagination.limit < total,
        hasPrevPage: pagination.page > 1,
      },
    };
  }

  async approve(id: string, isApproved: boolean) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    return this.prisma.review.update({
      where: { id },
      data: { isApproved },
    });
  }

  async remove(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    await this.prisma.review.delete({ where: { id } });
    return { message: 'Review deleted' };
  }
}
