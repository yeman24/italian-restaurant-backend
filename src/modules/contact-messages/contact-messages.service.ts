import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';
import { UpdateContactStatusDto } from './dto/update-contact-status.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { InquiryStatus, Prisma } from '@prisma/client';

@Injectable()
export class ContactMessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateContactMessageDto) {
    const contact = await this.prisma.contactMessage.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        inquiryType: dto.inquiryType,
        status: InquiryStatus.UNREAD,
        preferredDate: dto.preferredDate ? new Date(dto.preferredDate) : null,
        guestsCount: dto.guestsCount,
        message: dto.message,
      },
    });

    await this.notifications.sendContactNotification({
      name: contact.name,
      email: contact.email,
      inquiryType: contact.inquiryType,
      message: contact.message,
    });

    return {
      success: true,
      message: 'Inquiry transmitted to AURA Concierge',
      id: contact.id,
    };
  }

  async findAll(pagination: PaginationDto, status?: InquiryStatus) {
    const where: Prisma.ContactMessageWhereInput = {};
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.contactMessage.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contactMessage.count({ where }),
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

  async updateStatus(id: string, dto: UpdateContactStatusDto) {
    const existing = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Inquiry message not found');

    return this.prisma.contactMessage.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.replyNotes && { replyNotes: dto.replyNotes }),
      },
    });
  }

  async subscribeNewsletter(email: string) {
    const subscriber = await this.prisma.newsletterSubscriber.upsert({
      where: { email: email.toLowerCase() },
      create: { email: email.toLowerCase() },
      update: { isActive: true },
    });

    return {
      success: true,
      message: 'Subscribed to the AURA Salon Gazette',
      email: subscriber.email,
    };
  }
}
