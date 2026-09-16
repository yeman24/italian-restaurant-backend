import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReservationStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateReservationStatusDto {
  @ApiProperty({ enum: ReservationStatus, example: ReservationStatus.CONFIRMED })
  @IsEnum(ReservationStatus)
  status: ReservationStatus;

  @ApiPropertyOptional({ example: 'table-uuid-here' })
  @IsOptional()
  @IsString()
  tableId?: string;
}
