import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateTastingMenuDto {
  @ApiProperty({ example: 'The Autumn Terroir' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'autumn-terroir' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ example: 'An 8-course odyssey celebrating Scotland’s rivers, lochs and moors.' })
  @IsString()
  @IsNotEmpty()
  subtitle: string;

  @ApiProperty({ example: 'Conceived by Chef Patron Euan Macleod...' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 175 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 115 })
  @IsNumber()
  @Min(0)
  pairingPrice: number;

  @ApiPropertyOptional({ example: 195 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  prestigePairingPrice?: number;

  @ApiProperty({ example: 8 })
  @IsNumber()
  @Min(1)
  coursesCount: number;

  @ApiPropertyOptional({ example: 'Approx. 3 hours' })
  @IsOptional()
  @IsString()
  duration?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    example: [
      {
        number: 1,
        title: 'Hebridean Seaweed Brot',
        gaelicTitle: 'Brot Feamainn',
        description: 'Sourdough leavened for 48 hours with smoked peated butter',
        pairing: 'NV Billecart-Salmon Brut Rosé',
      },
    ],
  })
  @IsArray()
  courses: any[];
}
