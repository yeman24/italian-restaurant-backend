import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreatePaymentIntentDto {
  @ApiProperty({ example: 'reservation-uuid-here' })
  @IsString()
  @IsNotEmpty()
  reservationId: string;

  @ApiProperty({ example: 'guest@example.com' })
  @IsEmail()
  email: string;

}
