import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationStatusDto } from './dto/update-reservation-status.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { ReservationStatus, Role } from '@prisma/client';

@ApiTags('Reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Public()
  @Get('availability')
  @ApiOperation({ summary: 'Check live seating availability by date and party size' })
  checkAvailability(@Query() dto: CheckAvailabilityDto) {
    return this.reservationsService.checkAvailability(dto);
  }

  @Public()
  @Post()
  @ApiOperation({ summary: 'Create a new reservation booking' })
  create(@Body() dto: CreateReservationDto, @CurrentUser('id') userId?: string) {
    return this.reservationsService.create(dto, userId);
  }

  @Public()
  @Get('code/:code')
  @ApiOperation({ summary: 'Look up booking voucher by reference code (e.g. AURA-123456)' })
  findByCode(@Param('code') code: string) {
    return this.reservationsService.findByCode(code);
  }

  @Public()
  @Patch('code/:code/cancel')
  @ApiOperation({ summary: 'Cancel booking by reference code' })
  cancelByCode(@Param('code') code: string) {
    return this.reservationsService.cancelByCode(code);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'List all reservations with filters (Staff/Admin)' })
  @ApiQuery({ name: 'status', enum: ReservationStatus, required: false })
  @ApiQuery({ name: 'date', type: String, required: false, example: '2026-10-15' })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('status') status?: ReservationStatus,
    @Query('date') date?: string,
  ) {
    return this.reservationsService.findAll(pagination, status, date);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  @ApiBearerAuth()
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update reservation status or assign table (Staff/Admin)' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateReservationStatusDto) {
    return this.reservationsService.updateStatus(id, dto);
  }
}
