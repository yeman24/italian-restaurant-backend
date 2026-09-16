import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateRestaurantDto {
  @ApiPropertyOptional({ example: 'AURA Edinburgh' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Two Michelin Stars' })
  @IsOptional()
  @IsString()
  stars?: string;

  @ApiPropertyOptional({ example: 'Euan Macleod' })
  @IsOptional()
  @IsString()
  chefPatron?: string;

  @ApiPropertyOptional({ example: 'Fiona Sinclair' })
  @IsOptional()
  @IsString()
  headSommelier?: string;

  @ApiPropertyOptional({ example: '14–16 Royal Terrace Vaults, Edinburgh, EH7 5TB, Scotland' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '+44 (0)131 556 8920' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'reservations@aura-edinburgh.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 28 })
  @IsOptional()
  @IsInt()
  maxCapacity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  openingHours?: any;

  @ApiPropertyOptional()
  @IsOptional()
  coordinates?: any;
}
