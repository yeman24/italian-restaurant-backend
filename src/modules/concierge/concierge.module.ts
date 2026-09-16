import { Module } from '@nestjs/common';
import { MenuModule } from '@/modules/menu/menu.module';
import { ConciergeController } from './concierge.controller';
import { ConciergeService } from './concierge.service';

@Module({
  imports: [MenuModule],
  controllers: [ConciergeController],
  providers: [ConciergeService],
})
export class ConciergeModule {}
