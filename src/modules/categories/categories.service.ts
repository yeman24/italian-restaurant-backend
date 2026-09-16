import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const slug = dto.slug || dto.name.toLowerCase().replace(/\s+/g, '-');

    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException('Category slug already exists');
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        displayOrder: dto.displayOrder ?? 0,
      },
    });
  }

  async findAll() {
    return this.prisma.category.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: {
          select: { dishes: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { dishes: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.category.delete({ where: { id } });
    return { message: 'Category deleted' };
  }
}
