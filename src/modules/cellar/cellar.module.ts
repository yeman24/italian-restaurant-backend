import { Module } from '@nestjs/common';
import { CellarController } from './cellar.controller';
import { CellarService } from './cellar.service';

@Module({
  controllers: [CellarController],
  providers: [CellarService],
})
export class CellarModule {}
