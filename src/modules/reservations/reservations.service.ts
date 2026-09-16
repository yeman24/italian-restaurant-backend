import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationStatusDto } from './dto/update-reservation-status.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DiningSection, DiningService, Prisma, ReservationStatus } from '@prisma/client';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async checkAvailability(dto: CheckAvailabilityDto) {
    const bookingDate = new Date(dto.date);
    const dayOfWeek = bookingDate.getUTCDay();

    // Monday (1) and Tuesday (2) are closed for foraging
    if (dayOfWeek === 1 || dayOfWeek === 2) {
      return {
        isAvailable: false,
        message: 'AURA is closed on Mondays & Tuesdays for Highland foraging and cellar curation.',
        dinnerSlots: [],
        lunchSlots: [],
      };
    }

    const startOfDay = new Date(bookingDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(bookingDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const existingBookings = await this.prisma.reservation.findMany({
      where: {
        date: { gte: startOfDay, lte: endOfDay },
        status: { notIn: [ReservationStatus.CANCELLED, ReservationStatus.NO_SHOW] },
      },
      select: { timeSlot: true, guestsCount: true },
    });

    const slotTally = new Map<string, number>();
    existingBookings.forEach((b) => {
      slotTally.set(b.timeSlot, (slotTally.get(b.timeSlot) || 0) + b.guestsCount);
    });

    const maxSlotCapacity = 14; // Per sitting window
    const buildSlots = (slots: string[]) =>
      slots.map((time) => {
        const currentGuests = slotTally.get(time) || 0;
        const remaining = maxSlotCapacity - currentGuests;
        const isAvailable = remaining >= dto.guests;
        let status = 'Available';
        if (!isAvailable) {
          status = 'Fully Booked';
        } else if (remaining <= 4) {
          status = 'Few tables left';
        }
        return { time, status, isAvailable };
      });

    const isFridayOrSaturday = dayOfWeek === 5 || dayOfWeek === 6;

    return {
      isAvailable: true,
      dinnerSlots: buildSlots(['17:30', '18:15', '19:00', '19:45', '20:30']),
      lunchSlots: isFridayOrSaturday
        ? buildSlots(['12:00', '12:45', '13:15'])
        : [],
    };
  }

  async create(dto: CreateReservationDto, userId?: string) {
    const bookingDate = new Date(dto.date);
    const dayOfWeek = bookingDate.getUTCDay();

    if (dayOfWeek === 1 || dayOfWeek === 2) {
      throw new BadRequestException('The restaurant is closed on Mondays and Tuesdays');
    }

    // Generate unique 6-digit confirmation code e.g. AURA-829104
    let confirmationCode = '';
    let isUnique = false;
    while (!isUnique) {
      const randomCode = Math.floor(100000 + Math.random() * 900000);
      confirmationCode = `AURA-${randomCode}`;
      const existing = await this.prisma.reservation.findUnique({
        where: { confirmationCode },
      });
      if (!existing) isUnique = true;
    }

    const reservation = await this.prisma.reservation.create({
      data: {
        confirmationCode,
        date: bookingDate,
        timeSlot: dto.timeSlot,
        service: dto.service || DiningService.DINNER,
        guestsCount: dto.guestsCount,
        status: ReservationStatus.CONFIRMED,
        experienceName: dto.experienceName,
        pairingTier: dto.pairingTier || 'none',
        seatingPreference: dto.seatingPreference || DiningSection.DINING_ROOM,
        fullName: dto.fullName,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        dietaryNotes: dto.dietaryNotes,
        specialOccasion: dto.specialOccasion,
        totalEstimate: new Prisma.Decimal(dto.totalEstimate),
        userId,
      },
    });

    // Fire confirmation email
    await this.notifications.sendReservationConfirmation(reservation.email, {
      fullName: reservation.fullName,
      confirmationCode: reservation.confirmationCode,
      date: dto.date,
      timeSlot: reservation.timeSlot,
      guests: reservation.guestsCount,
      experience: reservation.experienceName,
      totalEstimate: Number(reservation.totalEstimate),
    });

    return reservation;
  }

  async findByCode(confirmationCode: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { confirmationCode },
      include: { table: true, payment: true },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation #${confirmationCode} not found`);
    }

    return reservation;
  }

  async findAll(pagination: PaginationDto, status?: ReservationStatus, date?: string) {
    const where: Prisma.ReservationWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (date) {
      const d = new Date(date);
      const start = new Date(d);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setUTCHours(23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    }

    const [data, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { date: 'desc' },
        include: { table: true },
      }),
      this.prisma.reservation.count({ where }),
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

  async updateStatus(id: string, dto: UpdateReservationStatusDto) {
    const reservation = await this.prisma.reservation.findUnique({ where: { id } });
    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    return this.prisma.reservation.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.tableId && { tableId: dto.tableId }),
      },
    });
  }

  async cancelByCode(confirmationCode: string) {
    const reservation = await this.findByCode(confirmationCode);

    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new BadRequestException('Reservation is already cancelled');
    }

    return this.prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: ReservationStatus.CANCELLED },
    });
  }
}
