import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '@/common/dto/pagination.dto';

export class FilterDishesDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Category slug or ID' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Dietary tag (e.g. gluten-free, vegan)' })
  @IsOptional()
  @IsString()
  dietary?: string;

  @ApiPropertyOptional({ description: 'Keyword search for dish name, provenance, or Gaelic title' })
  @IsOptional()
  @IsString()
  search?: string;
}
