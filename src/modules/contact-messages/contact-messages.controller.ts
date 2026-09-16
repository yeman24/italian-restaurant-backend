import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ContactMessagesService } from './contact-messages.service';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';
import { UpdateContactStatusDto } from './dto/update-contact-status.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { Public } from '@/common/decorators/public.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { InquiryStatus, Role } from '@prisma/client';

@ApiTags('Contact & Inquiries')
@Controller('contact')
export class ContactMessagesController {
  constructor(private readonly contactMessagesService: ContactMessagesService) {}

  @Public()
  @Post('inquiries')
  @ApiOperation({ summary: 'Submit public concierge message, private dining inquiry or press request' })
  createInquiry(@Body() dto: CreateContactMessageDto) {
    return this.contactMessagesService.create(dto);
  }

  @Public()
  @Post('newsletter')
  @ApiOperation({ summary: 'Subscribe to AURA Salon Gazette' })
  subscribeNewsletter(@Body('email') email: string) {
    return this.contactMessagesService.subscribeNewsletter(email);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  @ApiBearerAuth()
  @Get('inquiries')
  @ApiOperation({ summary: 'List customer inquiries with status filtering (Staff/Admin)' })
  @ApiQuery({ name: 'status', enum: InquiryStatus, required: false })
  findAllInquiries(
    @Query() pagination: PaginationDto,
    @Query('status') status?: InquiryStatus,
  ) {
    return this.contactMessagesService.findAll(pagination, status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  @ApiBearerAuth()
  @Patch('inquiries/:id/status')
  @ApiOperation({ summary: 'Update inquiry status or attach reply notes' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateContactStatusDto,
  ) {
    return this.contactMessagesService.updateStatus(id, dto);
  }
}
