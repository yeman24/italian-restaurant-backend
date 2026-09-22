import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiningSection, DiningService } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  Max,
  Min,
} from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({ example: '2026-10-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '19:00' })
  @IsString()
  @IsNotEmpty()
  timeSlot: string;

  @ApiPropertyOptional({ enum: DiningService, default: DiningService.DINNER })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? (value.toUpperCase() as DiningService) : value))
  @IsEnum(DiningService)
  service?: DiningService;

  @ApiProperty({ example: 2, minimum: 1, maximum: 8 })
  @IsInt()
  @Min(1)
  @Max(8)
  guestsCount: number;

  @ApiProperty({ example: 'The Autumn Terroir (8 Courses)' })
  @IsString()
  @IsNotEmpty()
  experienceName: string;

  @ApiPropertyOptional({ example: 'sommelier' })
  @IsOptional()
  @IsString()
  pairingTier?: string;

  @ApiPropertyOptional({ enum: DiningSection, default: DiningSection.DINING_ROOM })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? (value.replace(/-/g, '_').toUpperCase() as DiningSection) : value,
  )
  @IsEnum(DiningSection)
  seatingPreference?: DiningSection;

  @ApiProperty({ example: 'Lady Eleanor Vance' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'eleanor.vance@example.co.uk' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+44 7911 123456' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: 'No shellfish please; gluten sensitivity' })
  @IsOptional()
  @IsString()
  dietaryNotes?: string;

  @ApiPropertyOptional({ example: 'Wedding Anniversary' })
  @IsOptional()
  @IsString()
  specialOccasion?: string;

  @ApiProperty({ description: 'Must be true after the guest accepts the current reservation policy' })
  @IsBoolean()
  policyAccepted: boolean;
}
