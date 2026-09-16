import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateDishDto {
  @ApiProperty({ example: 'Hand-Dived Orkney Scallop' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Sgàilleag Arcaibh' })
  @IsOptional()
  @IsString()
  gaelicName?: string;

  @ApiProperty({ example: 'category-uuid-here' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  courseNumber?: number;

  @ApiProperty({ example: 'Lightly torched Orkney scallop with smoked bone marrow dashi...' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'Harvested by diver Kevin MacLeod in the freezing tidal flows...' })
  @IsString()
  @IsNotEmpty()
  story: string;

  @ApiProperty({ example: 'Scapa Flow, Orkney Islands (Hand-dived by Kevin MacLeod)' })
  @IsString()
  @IsNotEmpty()
  provenance: string;

  @ApiProperty({ example: 34 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 'https://images.unsplash.com/photo-1544025162-d76694265947' })
  @IsString()
  @IsNotEmpty()
  image: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isSignature?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isChefRecommendation?: boolean;

  @ApiPropertyOptional({
    example: {
      name: 'Puligny-Montrachet 1er Cru "Les Folatières"',
      producer: 'Domaine Alain Chavy',
      vintage: '2020',
      region: 'Burgundy, France',
      notes: 'Crisp flint minerality with subtle hazelnut and white peach.',
    },
  })
  @IsOptional()
  winePairing?: any;

  @ApiPropertyOptional({ example: ['gluten-free', 'pescatarian'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietary?: string[];

  @ApiPropertyOptional({ example: ['Molluscs', 'Fish'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];
}
