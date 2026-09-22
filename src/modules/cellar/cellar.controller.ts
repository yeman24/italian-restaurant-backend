import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CellarService } from './cellar.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('Cellar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER, Role.SOMMELIER, Role.STAFF)
@Controller('cellar')
export class CellarController {
  constructor(private readonly cellarService: CellarService) {}

  @Get('items')
  @ApiOperation({ summary: 'List live cellar inventory for staff' })
  findAll() {
    return this.cellarService.findAll();
  }
}
