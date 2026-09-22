import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  RawBodyRequest,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { Public } from '@/common/decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Payments & Deposits')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Post('create-intent')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Create a Stripe PaymentIntent for reservation table deposit' })
  createPaymentIntent(@Body() dto: CreatePaymentIntentDto, @Headers('idempotency-key') idempotencyKey?: string) {
    return this.paymentsService.createPaymentIntent(dto, idempotencyKey);
  }

  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'Stripe webhook receiver for payment event reconciliation' })
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
    return this.paymentsService.handleWebhook(signature || '', rawBody);
  }
}
