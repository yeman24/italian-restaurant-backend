import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 'The Times' })
  @IsString()
  @IsNotEmpty()
  publication: string;

  @ApiProperty({ example: 'Giles Coren' })
  @IsString()
  @IsNotEmpty()
  author: string;

  @ApiProperty({ example: 'The most electrifying dining room in northern Europe...' })
  @IsString()
  @IsNotEmpty()
  quote: string;

  @ApiProperty({ example: '10 / 10' })
  @IsString()
  @IsNotEmpty()
  rating: string;

  @ApiProperty({ example: '2025' })
  @IsString()
  @IsNotEmpty()
  year: string;

  @ApiPropertyOptional({ example: 'Restaurant of the Year' })
  @IsOptional()
  @IsString()
  badge?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
