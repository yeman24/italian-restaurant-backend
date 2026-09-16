import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { UploadService } from '@/modules/upload/upload.service';
import { CreateGalleryItemDto } from './dto/create-gallery-item.dto';
import { GalleryCategory } from '@prisma/client';

@Injectable()
export class GalleryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  async create(dto: CreateGalleryItemDto) {
    return this.prisma.galleryItem.create({
      data: {
        title: dto.title,
        category: dto.category,
        imageUrl: dto.imageUrl,
        publicId: dto.publicId,
        caption: dto.caption,
        aspect: dto.aspect || 'square',
        displayOrder: dto.displayOrder ?? 0,
      },
    });
  }

  async uploadAndCreate(file: Express.Multer.File, title: string, category: GalleryCategory, caption?: string) {
    const { url, publicId } = await this.uploadService.uploadImage(file, 'aura-edinburgh/gallery');

    return this.prisma.galleryItem.create({
      data: {
        title,
        category,
        imageUrl: url,
        publicId,
        caption,
        aspect: 'square',
      },
    });
  }

  async findAll(category?: GalleryCategory) {
    const where = category ? { category } : {};
    return this.prisma.galleryItem.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async remove(id: string) {
    const item = await this.prisma.galleryItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Gallery item not found');

    if (item.publicId) {
      await this.uploadService.deleteImage(item.publicId);
    }

    await this.prisma.galleryItem.delete({ where: { id } });
    return { message: 'Gallery item removed' };
  }
}
