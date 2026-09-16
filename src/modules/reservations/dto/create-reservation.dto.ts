import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiningSection, DiningService } from '@prisma/client';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
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
  @IsEnum(DiningSection)
  seatingPreference?: DiningSection;

  @ApiProperty({ example: 'Lady Eleanor Vance' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'eleanor.vance@example.co.uk' })
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

  @ApiProperty({ example: 580.00 })
  @IsNumber()
  totalEstimate: number;
}
