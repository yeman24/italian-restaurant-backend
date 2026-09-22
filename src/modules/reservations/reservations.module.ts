import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { OptionalJwtAuthGuard } from '@/common/guards/optional-jwt-auth.guard';

@Module({
  controllers: [ReservationsController],
  providers: [ReservationsService, OptionalJwtAuthGuard],
  exports: [ReservationsService],
})
export class ReservationsModule {}
