import { Injectable, Logger, NotFoundException, BadRequestException, ServiceUnavailableException, ConflictException } from '@nestjs/common';
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
    }
  }

  async createPaymentIntent(dto: CreatePaymentIntentDto, idempotencyKey?: string) {
    if (!idempotencyKey || idempotencyKey.length > 100) {
      throw new BadRequestException('A valid Idempotency-Key header is required');
    }
    if (!this.stripe) {
      throw new ServiceUnavailableException('Payments are not configured');
    }

    const reservation = await this.prisma.reservation.findUnique({
      where: { id: dto.reservationId },
      include: { payment: true },
    });

    if (!reservation || reservation.email.toLowerCase() !== dto.email.toLowerCase()) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.status === ReservationStatus.CANCELLED || reservation.status === ReservationStatus.COMPLETED || reservation.status === ReservationStatus.NO_SHOW) {
      throw new BadRequestException('This reservation cannot accept a payment');
    }
    if (reservation.holdExpiresAt && reservation.holdExpiresAt < new Date()) {
      throw new ConflictException('The payment hold for this reservation has expired');
    }
    if (reservation.payment?.status === PaymentStatus.SUCCEEDED) {
      throw new ConflictException('This reservation has already been paid');
    }
    if (
      reservation.payment &&
      reservation.payment.idempotencyKey !== idempotencyKey &&
      reservation.payment.status !== PaymentStatus.FAILED
    ) {
      throw new ConflictException('A payment intent already exists for this reservation');
    }
    if (reservation.payment?.idempotencyKey === idempotencyKey && reservation.payment.stripeClientSecret) {
      return {
        paymentId: reservation.payment.id,
        clientSecret: reservation.payment.stripeClientSecret,
        amount: Number(reservation.payment.amount),
        currency: 'GBP',
      };
    }

    const amount = Number(reservation.depositAmount) > 0
      ? Number(reservation.depositAmount)
      : reservation.guestsCount * 50;
    const amountInPence = Math.round(amount * 100);

    const stripe = this.stripe;
    if (!stripe) throw new ServiceUnavailableException('Payments are not configured');
    let paymentIntentId: string;
    let clientSecret: string;
    try {
        const intent = await stripe.paymentIntents.create({
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
        clientSecret = intent.client_secret || '';
        if (!clientSecret) throw new Error('Stripe did not return a client secret');
    } catch (err) {
      this.logger.error(`Stripe error: ${(err as Error).message}`);
      throw new BadRequestException('Failed to initialize Stripe PaymentIntent');
    }

    const payment = await this.prisma.payment.upsert({
      where: { reservationId: reservation.id },
      create: {
        reservationId: reservation.id,
        stripePaymentIntentId: paymentIntentId,
        stripeClientSecret: clientSecret,
        idempotencyKey,
        amount: new Prisma.Decimal(amount),
        currency: 'gbp',
        status: PaymentStatus.PENDING,
      },
      update: {
        stripePaymentIntentId: paymentIntentId,
        stripeClientSecret: clientSecret,
        idempotencyKey,
        amount: new Prisma.Decimal(amount),
        status: PaymentStatus.PENDING,
      },
    });

    return {
      paymentId: payment.id,
      clientSecret,
      amount,
      currency: 'GBP',
    };
  }

  async handleWebhook(signature: string, rawPayload: Buffer) {
    if (!this.stripe) {
      throw new ServiceUnavailableException('Stripe webhook processing is not configured');
    }

    const webhookSecret = this.configService.get<string>('stripe.webhookSecret');
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawPayload, signature, webhookSecret || '');
    } catch (err) {
      throw new BadRequestException(`Webhook signature verification failed: ${(err as Error).message}`);
    }

    const intent = event.data.object as Stripe.PaymentIntent;
    const payment = await this.prisma.payment.findUnique({ where: { stripePaymentIntentId: intent.id } });
    const reservationId = intent.metadata?.reservationId;

    if (payment && reservationId && reservationId !== payment.reservationId) {
      this.logger.error(`Stripe metadata mismatch for PaymentIntent ${intent.id}`);
      throw new BadRequestException('Payment metadata does not match the reservation');
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.paymentEvent.create({
          data: { eventId: event.id, eventType: event.type, paymentId: payment?.id },
        });

        if (event.type === 'payment_intent.succeeded' && payment) {
          const expectedAmountInPence = Math.round(Number(payment.amount) * 100);
          if (intent.amount !== expectedAmountInPence) {
            throw new BadRequestException('Payment amount does not match the reservation');
          }

          await tx.payment.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.SUCCEEDED },
          });

          await tx.reservation.update({
            where: { id: payment.reservationId },
            data: {
              status: ReservationStatus.CONFIRMED,
              depositAmount: new Prisma.Decimal(intent.amount / 100),
            },
          });

          this.logger.log(`Deposit confirmed for reservation ${payment.reservationId}`);
        }

        if (event.type === 'payment_intent.payment_failed' && payment) {
          await tx.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.FAILED } });
        }
        if (event.type === 'payment_intent.canceled' && payment) {
          await tx.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.FAILED } });
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { received: true, duplicate: true };
      }
      throw error;
    }

    return { received: true };
  }
}
