import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InquiryType } from '@prisma/client';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateContactMessageDto {
  @ApiProperty({ example: 'Lady Eleanor Vance' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'eleanor.vance@example.co.uk' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '+44 7911 123456' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: InquiryType, default: InquiryType.GENERAL })
  @IsOptional()
  @IsEnum(InquiryType)
  inquiryType?: InquiryType;

  @ApiPropertyOptional({ example: '2026-11-20' })
  @IsOptional()
  @IsDateString()
  preferredDate?: string;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsInt()
  guestsCount?: number;

  @ApiProperty({ example: 'Inquiring about private cellar booking for an anniversary salon.' })
  @IsString()
  @MinLength(10)
  message: string;
}
