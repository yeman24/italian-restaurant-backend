import { PartialType } from '@nestjs/swagger';
import { CreateTastingMenuDto } from './create-tasting-menu.dto';

export class UpdateTastingMenuDto extends PartialType(CreateTastingMenuDto) {}
