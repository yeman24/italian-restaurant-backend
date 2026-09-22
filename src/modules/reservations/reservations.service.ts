import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
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
    private readonly config: ConfigService,
  ) {}

  private readonly dinnerSlots = ['17:30', '18:15', '19:00', '19:45', '20:30'];
  private readonly lunchSlots = ['12:00', '12:45', '13:15'];

  private calculateTotalEstimate(dto: CreateReservationDto): number {
    const normalize = (str: string) =>
      (str || '')
        .normalize('NFKD')
        .replace(/[\u2018\u2019`]/g, "'")
        .toLowerCase()
        .trim();

    const normalizedExp = normalize(dto.experienceName);
    let experiencePrice: number | undefined;

    if (normalizedExp.includes('autumn') || normalizedExp.includes('terroir')) {
      experiencePrice = 175;
    } else if (
      normalizedExp.includes('forager') ||
      normalizedExp.includes('harvest') ||
      normalizedExp.includes('plant')
    ) {
      experiencePrice = 155;
    } else if (
      normalizedExp.includes('atelier') ||
      normalizedExp.includes('counter') ||
      normalizedExp.includes('chef')
    ) {
      experiencePrice = 225;
    } else {
      const standardLookup: Record<string, number> = {
        'the autumn terroir (8 courses)': 175,
        "the forager's harvest (plant-based)": 155,
        "chef's atelier counter (10 courses)": 225,
      };
      experiencePrice = standardLookup[normalizedExp];
    }

    if (experiencePrice === undefined) {
      experiencePrice = 175;
    }

    const normalizedPairing = normalize(dto.pairingTier || 'none');
    let pairingPrice = 0;

    if (normalizedPairing.includes('prestige') || normalizedPairing.includes('grand cru')) {
      pairingPrice = 195;
    } else if (normalizedPairing.includes('sommelier') || normalizedPairing.includes('wine')) {
      pairingPrice = 115;
    } else if (
      normalizedPairing.includes('non') ||
      normalizedPairing.includes('botanical') ||
      normalizedPairing.includes('infusion') ||
      normalizedPairing.includes('tea')
    ) {
      pairingPrice = 65;
    } else {
      pairingPrice = 0;
    }

    return (experiencePrice + pairingPrice) * dto.guestsCount;
  }

  async checkAvailability(dto: CheckAvailabilityDto) {
    await this.expirePendingHolds();
    const bookingDate = new Date(`${dto.date}T00:00:00.000Z`);
    const today = new Date();
    const todayDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const maxDate = new Date(todayDate);
    maxDate.setUTCDate(maxDate.getUTCDate() + this.config.get<number>('reservationHorizonDays', 90));
    if (bookingDate < todayDate || bookingDate > maxDate) {
      return {
        isAvailable: false,
        message: `Reservations are available from today through ${maxDate.toISOString().slice(0, 10)}.`,
        dinnerSlots: [],
        lunchSlots: [],
      };
    }
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
        OR: [
          { status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.SEATED, ReservationStatus.COMPLETED] } },
          { status: ReservationStatus.PENDING, holdExpiresAt: { gt: new Date() } },
        ],
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
      dinnerSlots: buildSlots(dayOfWeek === 0 ? ['17:00', '17:45', '18:30', '19:15', '19:45'] : this.dinnerSlots),
      lunchSlots: isFridayOrSaturday
        ? buildSlots(['12:00', '12:45', '13:15'])
        : [],
    };
  }

  async create(dto: CreateReservationDto, userId?: string, idempotencyKey?: string) {
    await this.expirePendingHolds();
    if (!idempotencyKey || idempotencyKey.length > 100) {
      throw new BadRequestException('A valid Idempotency-Key header is required');
    }
    if (!dto.policyAccepted) {
      throw new BadRequestException('The reservation policy must be accepted');
    }

    const idempotencyHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ ...dto, userId }))
      .digest('hex');
    const existingByKey = await this.prisma.reservation.findUnique({ where: { idempotencyKey } });
    if (existingByKey) {
      if (existingByKey.idempotencyHash !== idempotencyHash) {
        throw new ConflictException('This Idempotency-Key was already used for different booking details');
      }
      return existingByKey;
    }

    const cleanDateStr = dto.date.split('T')[0];
    const bookingDate = new Date(`${cleanDateStr}T00:00:00.000Z`);
    const dayOfWeek = bookingDate.getUTCDay();
    const today = new Date();
    const todayDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const maxDate = new Date(todayDate);
    maxDate.setUTCDate(maxDate.getUTCDate() + this.config.get<number>('reservationHorizonDays', 90));
    if (bookingDate < todayDate || bookingDate > maxDate) {
      throw new BadRequestException('The selected date is outside the reservation window');
    }

    if (dayOfWeek === 1 || dayOfWeek === 2) {
      throw new BadRequestException('The restaurant is closed on Mondays and Tuesdays');
    }

    const service = dto.service || DiningService.DINNER;
    const slots = service === DiningService.LUNCH ? this.lunchSlots : this.dinnerSlots;
    const isSunday = dayOfWeek === 0;
    const sundaySlots = ['17:00', '17:45', '18:30', '19:15', '19:45'];
    const serviceSlots = isSunday ? sundaySlots : slots;
    if (!serviceSlots.includes(dto.timeSlot) || (service === DiningService.LUNCH && ![5, 6].includes(dayOfWeek)) || (isSunday && service !== DiningService.DINNER)) {
      throw new BadRequestException('The selected sitting is not available for this date and service');
    }

    const totalEstimate = this.calculateTotalEstimate(dto);
    const depositRequired = this.config.get<boolean>('depositRequired', false);
    const policyVersion = this.config.get<string>('reservationPolicyVersion', '2026-01');
    const holdExpiresAt = depositRequired ? new Date(Date.now() + 15 * 60 * 1000) : null;
    let reservation;

    try {
      reservation = await this.prisma.$transaction(
        async (tx) => {
          const existingBookings = await tx.reservation.findMany({
            where: {
              date: {
                gte: new Date(`${cleanDateStr}T00:00:00.000Z`),
                lte: new Date(`${cleanDateStr}T23:59:59.999Z`),
              },
              timeSlot: dto.timeSlot,
              OR: [
                { status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.SEATED, ReservationStatus.COMPLETED] } },
                { status: ReservationStatus.PENDING, holdExpiresAt: { gt: new Date() } },
              ],
            },
            select: { guestsCount: true },
          });
          const bookedGuests = existingBookings.reduce((total, booking) => total + booking.guestsCount, 0);
          if (bookedGuests + dto.guestsCount > 14) {
            throw new ConflictException('This sitting is no longer available for the selected party size');
          }

          let confirmationCode = '';
          for (let attempt = 0; attempt < 5; attempt += 1) {
            confirmationCode = `AURA-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
            const existing = await tx.reservation.findUnique({ where: { confirmationCode } });
            if (!existing) break;
            if (attempt === 4) throw new ConflictException('Could not create a unique confirmation code');
          }

          return tx.reservation.create({
            data: {
              confirmationCode,
              date: bookingDate,
              timeSlot: dto.timeSlot,
              service,
              guestsCount: dto.guestsCount,
              status: depositRequired ? ReservationStatus.PENDING : ReservationStatus.CONFIRMED,
              experienceName: dto.experienceName,
              pairingTier: dto.pairingTier || 'none',
              seatingPreference: dto.seatingPreference || DiningSection.DINING_ROOM,
              fullName: dto.fullName,
              email: dto.email.toLowerCase(),
              phone: dto.phone,
              dietaryNotes: dto.dietaryNotes,
              specialOccasion: dto.specialOccasion,
              totalEstimate: new Prisma.Decimal(totalEstimate),
              userId,
              idempotencyKey,
              idempotencyHash,
              policyAcceptedAt: new Date(),
              policyVersion,
              holdExpiresAt,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('This sitting was just booked by another guest. Please choose another time.');
      }
      throw error;
    }

    // Fire confirmation email
    await this.notifications.sendReservationConfirmation(reservation.email, {
      fullName: reservation.fullName,
      confirmationCode: reservation.confirmationCode,
      date: cleanDateStr,
      timeSlot: reservation.timeSlot,
      guests: reservation.guestsCount,
      experience: reservation.experienceName,
      totalEstimate: Number(reservation.totalEstimate),
      requiresDeposit: reservation.status === ReservationStatus.PENDING,
    });

    return reservation;
  }

  async findByCode(confirmationCode: string, email?: string) {
    if (!email) throw new BadRequestException('Email is required to access a reservation');
    const reservation = await this.prisma.reservation.findUnique({
      where: { confirmationCode },
      select: {
        id: true,
        confirmationCode: true,
        date: true,
        timeSlot: true,
        service: true,
        guestsCount: true,
        experienceName: true,
        pairingTier: true,
        seatingPreference: true,
        fullName: true,
        email: true,
        totalEstimate: true,
        depositAmount: true,
        status: true,
        createdAt: true,
        holdExpiresAt: true,
        cancelledAt: true,
      },
    });

    if (!reservation || reservation.email.toLowerCase() !== email.toLowerCase()) {
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

  async cancelByCode(confirmationCode: string, email?: string) {
    const reservation = await this.findByCode(confirmationCode, email);

    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new BadRequestException('Reservation is already cancelled');
    }

    const bookingDate = new Date(`${reservation.date.toISOString().slice(0, 10)}T${reservation.timeSlot}:00.000Z`);
    if (bookingDate.getTime() - Date.now() < 48 * 60 * 60 * 1000) {
      throw new BadRequestException('Public cancellations require at least 48 hours notice');
    }

    return this.prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: ReservationStatus.CANCELLED, cancelledAt: new Date(), cancellationReason: 'Guest cancellation' },
    });
  }

  private async expirePendingHolds() {
    await this.prisma.reservation.updateMany({
      where: {
        status: ReservationStatus.PENDING,
        holdExpiresAt: { lte: new Date() },
      },
      data: {
        status: ReservationStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: 'Payment hold expired',
      },
    });
  }
}
