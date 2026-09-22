import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';
import { ConciergeService } from './concierge.service';
import { ConciergeChatDto } from './dto/concierge-chat.dto';

@ApiTags('AI Dining Concierge')
@Controller('concierge')
export class ConciergeController {
  constructor(private readonly conciergeService: ConciergeService) {}

  @Public()
  @Post('chat')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Ask the menu-aware AURA dining concierge a question' })
  chat(@Body() dto: ConciergeChatDto) {
    return this.conciergeService.chat(dto);
  }
}
