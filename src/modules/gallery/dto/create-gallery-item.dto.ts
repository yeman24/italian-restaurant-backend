import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GalleryCategory } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateGalleryItemDto {
  @ApiProperty({ example: 'The Plated Scallop' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ enum: GalleryCategory, example: GalleryCategory.CULINARY })
  @IsEnum(GalleryCategory)
  category: GalleryCategory;

  @ApiProperty({ example: 'https://images.unsplash.com/photo-1544025162-d76694265947' })
  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  publicId?: string;

  @ApiPropertyOptional({ example: 'Orkney hand-dived scallop with bone marrow dashi' })
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiPropertyOptional({ example: 'square' })
  @IsOptional()
  @IsString()
  aspect?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  displayOrder?: number;
}
