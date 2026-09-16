import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InquiryStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateContactStatusDto {
  @ApiProperty({ enum: InquiryStatus, example: InquiryStatus.RESOLVED })
  @IsEnum(InquiryStatus)
  status: InquiryStatus;

  @ApiPropertyOptional({ example: 'Concierge responded via telephone and emailed cellar packet.' })
  @IsOptional()
  @IsString()
  replyNotes?: string;
}
