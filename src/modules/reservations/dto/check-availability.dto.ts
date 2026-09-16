import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, Max, Min } from 'class-validator';

export class CheckAvailabilityDto {
  @ApiProperty({ example: '2026-10-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 2, minimum: 1, maximum: 8 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8)
  guests: number;
}
