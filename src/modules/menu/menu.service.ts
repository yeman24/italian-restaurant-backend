import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { RedisService } from '@/modules/redis/redis.service';
import { CreateDishDto } from './dto/create-dish.dto';
import { UpdateDishDto } from './dto/update-dish.dto';
import { FilterDishesDto } from './dto/filter-dishes.dto';
import { CreateTastingMenuDto } from './dto/create-tasting-menu.dto';
import { UpdateTastingMenuDto } from './dto/update-tasting-menu.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async createDish(dto: CreateDishDto) {
    const slug = dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const existing = await this.prisma.dish.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException('A dish with this name or slug already exists');
    }

    let resolvedCategoryId = dto.categoryId;
    const cat = await this.prisma.category.findFirst({
      where: {
        OR: [{ id: dto.categoryId }, { slug: dto.categoryId }],
      },
    });
    if (cat) {
      resolvedCategoryId = cat.id;
    }

    const dish = await this.prisma.dish.create({
      data: {
        slug,
        name: dto.name,
        gaelicName: dto.gaelicName,
        categoryId: resolvedCategoryId,
        courseNumber: dto.courseNumber,
        description: dto.description,
        story: dto.story,
        provenance: dto.provenance,
        price: new Prisma.Decimal(dto.price),
        image: dto.image,
        isSignature: dto.isSignature ?? false,
        isChefRecommendation: dto.isChefRecommendation ?? false,
        winePairing: dto.winePairing || null,
        dietary: dto.dietary || [],
        allergens: dto.allergens || [],
      },
      include: { category: true },
    });

    await this.redis.delPattern('aura:dishes:*');
    return dish;
  }

  async findAllDishes(filter: FilterDishesDto) {
    const cacheKey = `aura:dishes:${JSON.stringify(filter)}`;
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) return cached;

    const where: Prisma.DishWhereInput = {};

    if (filter.category && filter.category !== 'all') {
      where.OR = [
        { categoryId: filter.category },
        { category: { slug: filter.category } },
      ];
    }

    if (filter.dietary && filter.dietary !== 'all') {
      where.dietary = { has: filter.dietary };
    }

    if (filter.search && filter.search.trim()) {
      const q = filter.search.trim();
      where.AND = [
        {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { provenance: { contains: q, mode: 'insensitive' } },
            { gaelicName: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [dishes, total] = await Promise.all([
      this.prisma.dish.findMany({
        where,
        skip: filter.skip,
        take: filter.limit,
        orderBy: [{ courseNumber: 'asc' }, { createdAt: 'desc' }],
        include: { category: true },
      }),
      this.prisma.dish.count({ where }),
    ]);

    const result = {
      data: dishes,
      meta: {
        total,
        page: filter.page,
        limit: filter.limit,
        totalPages: Math.ceil(total / filter.limit),
        hasNextPage: filter.page * filter.limit < total,
        hasPrevPage: filter.page > 1,
      },
    };

    await this.redis.set(cacheKey, result, 60 * 15); // 15 mins cache
    return result;
  }

  async findDishByIdOrSlug(idOrSlug: string) {
    const dish = await this.prisma.dish.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: { category: true },
    });

    if (!dish) {
      throw new NotFoundException(`Dish '${idOrSlug}' not found`);
    }

    return dish;
  }

  async updateDish(id: string, dto: UpdateDishDto) {
    await this.findDishByIdOrSlug(id);

    let resolvedCategoryId: string | undefined = undefined;
    if (dto.categoryId) {
      const cat = await this.prisma.category.findFirst({
        where: {
          OR: [{ id: dto.categoryId }, { slug: dto.categoryId }],
        },
      });
      resolvedCategoryId = cat ? cat.id : dto.categoryId;
    }

    const data: Prisma.DishUpdateInput = {
      ...(dto.name && { name: dto.name }),
      ...(dto.gaelicName !== undefined && { gaelicName: dto.gaelicName }),
      ...(resolvedCategoryId && { category: { connect: { id: resolvedCategoryId } } }),
      ...(dto.courseNumber !== undefined && { courseNumber: dto.courseNumber }),
      ...(dto.description && { description: dto.description }),
      ...(dto.story && { story: dto.story }),
      ...(dto.provenance && { provenance: dto.provenance }),
      ...(dto.price !== undefined && { price: new Prisma.Decimal(dto.price) }),
      ...(dto.image && { image: dto.image }),
      ...(dto.isSignature !== undefined && { isSignature: dto.isSignature }),
      ...(dto.isChefRecommendation !== undefined && { isChefRecommendation: dto.isChefRecommendation }),
      ...(dto.winePairing !== undefined && { winePairing: dto.winePairing }),
      ...(dto.dietary && { dietary: dto.dietary }),
      ...(dto.allergens && { allergens: dto.allergens }),
    };

    const updated = await this.prisma.dish.update({
      where: { id },
      data,
      include: { category: true },
    });

    await this.redis.delPattern('aura:dishes:*');
    return updated;
  }

  async removeDish(id: string) {
    await this.findDishByIdOrSlug(id);
    await this.prisma.dish.delete({ where: { id } });
    await this.redis.delPattern('aura:dishes:*');
    return { message: 'Dish removed successfully' };
  }

  // --- Tasting Menus ---

  async createTastingMenu(dto: CreateTastingMenuDto) {
    const slug = dto.slug || dto.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const existing = await this.prisma.tastingMenu.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException('A tasting menu with this title/slug already exists');
    }

    const menu = await this.prisma.tastingMenu.create({
      data: {
        slug,
        title: dto.title,
        subtitle: dto.subtitle,
        description: dto.description,
        price: new Prisma.Decimal(dto.price),
        pairingPrice: new Prisma.Decimal(dto.pairingPrice),
        prestigePairingPrice: new Prisma.Decimal(dto.prestigePairingPrice || 195),
        coursesCount: dto.coursesCount,
        duration: dto.duration || '3 hours',
        isActive: dto.isActive ?? true,
        courses: dto.courses,
      },
    });

    await this.redis.delPattern('aura:dishes:*');
    return menu;
  }

  async findAllTastingMenus(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    return this.prisma.tastingMenu.findMany({
      where,
      orderBy: { price: 'desc' },
    });
  }

  async findTastingMenuBySlug(slugOrId: string) {
    const menu = await this.prisma.tastingMenu.findFirst({
      where: {
        OR: [{ id: slugOrId }, { slug: slugOrId }],
      },
    });

    if (!menu) {
      throw new NotFoundException(`Tasting menu '${slugOrId}' not found`);
    }

    return menu;
  }

  async updateTastingMenu(id: string, dto: UpdateTastingMenuDto) {
    const menu = await this.findTastingMenuBySlug(id);

    const data: Prisma.TastingMenuUpdateInput = {
      ...(dto.title && { title: dto.title }),
      ...(dto.subtitle && { subtitle: dto.subtitle }),
      ...(dto.description && { description: dto.description }),
      ...(dto.price !== undefined && { price: new Prisma.Decimal(dto.price) }),
      ...(dto.pairingPrice !== undefined && { pairingPrice: new Prisma.Decimal(dto.pairingPrice) }),
      ...(dto.prestigePairingPrice !== undefined && { prestigePairingPrice: new Prisma.Decimal(dto.prestigePairingPrice) }),
      ...(dto.coursesCount !== undefined && { coursesCount: dto.coursesCount }),
      ...(dto.duration !== undefined && { duration: dto.duration }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.courses !== undefined && { courses: dto.courses }),
    };

    const updated = await this.prisma.tastingMenu.update({
      where: { id: menu.id },
      data,
    });

    await this.redis.delPattern('aura:dishes:*');
    return updated;
  }

  async removeTastingMenu(id: string) {
    const menu = await this.findTastingMenuBySlug(id);
    await this.prisma.tastingMenu.delete({ where: { id: menu.id } });
    await this.redis.delPattern('aura:dishes:*');
    return { message: 'Tasting menu removed successfully' };
  }
}

