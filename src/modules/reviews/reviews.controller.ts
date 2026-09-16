import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Reviews & Accolades')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List approved accolades and reviews' })
  findAllPublic() {
    return this.reviewsService.findAllPublic();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @Get('admin')
  @ApiOperation({ summary: 'List all reviews including unapproved (Admin/Manager)' })
  findAllAdmin(@Query() pagination: PaginationDto) {
    return this.reviewsService.findAllAdmin(pagination);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Add an accolade or review' })
  create(@Body() dto: CreateReviewDto, @CurrentUser('id') userId?: string) {
    return this.reviewsService.create(dto, userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve or unapprove review status' })
  approve(@Param('id') id: string, @Body('isApproved') isApproved: boolean) {
    return this.reviewsService.approve(id, isApproved);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Delete review (Admin)' })
  remove(@Param('id') id: string) {
    return this.reviewsService.remove(id);
  }
}
