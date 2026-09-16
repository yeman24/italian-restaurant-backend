import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '@/database/prisma.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { PaymentStatus, Prisma, ReservationStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const secretKey = this.configService.get<string>('stripe.secretKey');
    if (secretKey && secretKey !== 'sk_test_mock') {
      this.stripe = new Stripe(secretKey);
      this.logger.log('Stripe SDK initialized with live/test key.');
    } else {
      this.logger.log('Stripe running in simulated development mode.');
    }
  }

  async createPaymentIntent(dto: CreatePaymentIntentDto) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: dto.reservationId },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    const amountInPence = Math.round(dto.amount * 100);

    let paymentIntentId = `pi_sim_${Date.now()}`;
    let clientSecret = `pi_sim_secret_${Math.random().toString(36).substring(7)}`;

    if (this.stripe) {
      try {
        const intent = await this.stripe.paymentIntents.create({
          amount: amountInPence,
          currency: 'gbp',
          metadata: {
            reservationId: reservation.id,
            confirmationCode: reservation.confirmationCode,
            customerEmail: reservation.email,
          },
          receipt_email: reservation.email,
        });

        paymentIntentId = intent.id;
        clientSecret = intent.client_secret || clientSecret;
      } catch (err) {
        this.logger.error(`Stripe error: ${(err as Error).message}`);
        throw new BadRequestException('Failed to initialize Stripe PaymentIntent');
      }
    }

    const payment = await this.prisma.payment.upsert({
      where: { reservationId: reservation.id },
      create: {
        reservationId: reservation.id,
        stripePaymentIntentId: paymentIntentId,
        stripeClientSecret: clientSecret,
        amount: new Prisma.Decimal(dto.amount),
        currency: 'gbp',
        status: PaymentStatus.PENDING,
      },
      update: {
        stripePaymentIntentId: paymentIntentId,
        stripeClientSecret: clientSecret,
        amount: new Prisma.Decimal(dto.amount),
        status: PaymentStatus.PENDING,
      },
    });

    return {
      paymentId: payment.id,
      clientSecret,
      amount: dto.amount,
      currency: 'GBP',
    };
  }

  async handleWebhook(signature: string, rawPayload: Buffer) {
    if (!this.stripe) {
      this.logger.log('[MOCK STRIPE WEBHOOK] Received simulation event');
      return { received: true, simulated: true };
    }

    const webhookSecret = this.configService.get<string>('stripe.webhookSecret');
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawPayload, signature, webhookSecret || '');
    } catch (err) {
      throw new BadRequestException(`Webhook signature verification failed: ${(err as Error).message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const reservationId = intent.metadata?.reservationId;

      if (reservationId) {
        await this.prisma.payment.updateMany({
          where: { stripePaymentIntentId: intent.id },
          data: { status: PaymentStatus.SUCCEEDED },
        });

        await this.prisma.reservation.update({
          where: { id: reservationId },
          data: {
            status: ReservationStatus.CONFIRMED,
            depositAmount: new Prisma.Decimal(intent.amount / 100),
          },
        });

        this.logger.log(`Deposit confirmed for reservation ${reservationId}`);
      }
    }

    return { received: true };
  }
}
