import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ConciergeMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(1200)
  content: string;
}

export class ConciergeChatDto {
  @ApiProperty({ example: 'I am vegetarian and love earthy flavours. What would you recommend?' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(1200)
  message: string;

  @ApiPropertyOptional({ type: [ConciergeMessageDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ConciergeMessageDto)
  history?: ConciergeMessageDto[];
}
