import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { InquiryStatus, ReservationStatus } from '@prisma/client';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getExecutiveStats() {
    const today = new Date();
    const startOfToday = new Date(today);
    startOfToday.setUTCHours(0, 0, 0, 0);

    const endOfToday = new Date(today);
    endOfToday.setUTCHours(23, 59, 59, 999);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalReservationsCount,
      todayReservations,
      monthReservations,
      unreadInquiriesCount,
      totalUsersCount,
      totalDishesCount,
      recentBookings,
    ] = await Promise.all([
      this.prisma.reservation.count(),
      this.prisma.reservation.findMany({
        where: {
          date: { gte: startOfToday, lte: endOfToday },
          status: { notIn: [ReservationStatus.CANCELLED, ReservationStatus.NO_SHOW] },
        },
      }),
      this.prisma.reservation.findMany({
        where: {
          date: { gte: startOfMonth },
          status: { notIn: [ReservationStatus.CANCELLED, ReservationStatus.NO_SHOW] },
        },
        select: { totalEstimate: true, guestsCount: true, experienceName: true },
      }),
      this.prisma.contactMessage.count({ where: { status: InquiryStatus.UNREAD } }),
      this.prisma.user.count(),
      this.prisma.dish.count(),
      this.prisma.reservation.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Calculate covers
    const todayCovers = todayReservations.reduce((acc, curr) => acc + curr.guestsCount, 0);
    const maxDailyCapacity = 28; // 28 guests max capacity at AURA
    const todayOccupancyPercent = Math.min(100, Math.round((todayCovers / maxDailyCapacity) * 100));

    // Calculate month revenue estimate
    const monthEstimatedRevenue = monthReservations.reduce(
      (acc, curr) => acc + Number(curr.totalEstimate),
      0,
    );

    // Experience breakdown
    const experienceDistribution: Record<string, number> = {};
    monthReservations.forEach((r) => {
      experienceDistribution[r.experienceName] =
        (experienceDistribution[r.experienceName] || 0) + 1;
    });

    return {
      metrics: {
        totalReservationsCount,
        todayCovers,
        todayOccupancyPercent,
        monthEstimatedRevenue,
        unreadInquiriesCount,
        totalUsersCount,
        totalDishesCount,
      },
      experienceDistribution,
      recentBookings,
    };
  }
}
