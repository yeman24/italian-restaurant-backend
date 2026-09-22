import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'The refresh token issued during login' })
  @IsString()
  @IsOptional()
  refreshToken?: string;
}
