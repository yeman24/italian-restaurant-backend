import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MenuService } from './menu.service';
import { CreateDishDto } from './dto/create-dish.dto';
import { UpdateDishDto } from './dto/update-dish.dto';
import { FilterDishesDto } from './dto/filter-dishes.dto';
import { CreateTastingMenuDto } from './dto/create-tasting-menu.dto';
import { Public } from '@/common/decorators/public.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Menu')
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Public()
  @Get('dishes')
  @ApiOperation({ summary: 'List and filter seasonal dishes (with pagination & caching)' })
  findAllDishes(@Query() filter: FilterDishesDto) {
    return this.menuService.findAllDishes(filter);
  }

  @Public()
  @Get('dishes/:idOrSlug')
  @ApiOperation({ summary: 'Get single dish details, wine pairing and provenance by ID or slug' })
  findDish(@Param('idOrSlug') idOrSlug: string) {
    return this.menuService.findDishByIdOrSlug(idOrSlug);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @Post('dishes')
  @ApiOperation({ summary: 'Create a new dish (Admin/Manager)' })
  createDish(@Body() dto: CreateDishDto) {
    return this.menuService.createDish(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @Patch('dishes/:id')
  @ApiOperation({ summary: 'Update dish attributes, price or pairing (Admin/Manager)' })
  updateDish(@Param('id') id: string, @Body() dto: UpdateDishDto) {
    return this.menuService.updateDish(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Delete('dishes/:id')
  @ApiOperation({ summary: 'Remove a dish from menu (Admin)' })
  removeDish(@Param('id') id: string) {
    return this.menuService.removeDish(id);
  }

  // --- Tasting Menus ---

  @Public()
  @Get('tasting-menus')
  @ApiOperation({ summary: 'List active tasting menus (Autumn Terroir, Plant-Based, etc.)' })
  findAllTastingMenus() {
    return this.menuService.findAllTastingMenus();
  }

  @Public()
  @Get('tasting-menus/:slug')
  @ApiOperation({ summary: 'Get tasting menu details and course breakdown by slug' })
  findTastingMenu(@Param('slug') slug: string) {
    return this.menuService.findTastingMenuBySlug(slug);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiBearerAuth()
  @Post('tasting-menus')
  @ApiOperation({ summary: 'Create a new tasting menu sequence (Admin/Manager)' })
  createTastingMenu(@Body() dto: CreateTastingMenuDto) {
    return this.menuService.createTastingMenu(dto);
  }
}
