import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreatePaymentIntentDto {
  @ApiProperty({ example: 'reservation-uuid-here' })
  @IsString()
  @IsNotEmpty()
  reservationId: string;

  @ApiProperty({ example: 50.00, description: 'Deposit amount in GBP' })
  @IsNumber()
  @Min(1)
  amount: number;
}
