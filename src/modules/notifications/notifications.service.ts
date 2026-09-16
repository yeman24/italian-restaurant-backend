import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private resend: Resend | null = null;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('resend.apiKey');
    this.fromEmail = this.configService.get<string>('resend.fromEmail', 'concierge@aura-edinburgh.com');

    if (apiKey && apiKey !== 're_mock') {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.log('Resend running in development simulation mode.');
    }
  }

  async sendReservationConfirmation(to: string, reservationDetails: {
    fullName: string;
    confirmationCode: string;
    date: string;
    timeSlot: string;
    guests: number;
    experience: string;
    totalEstimate: number;
  }) {
    const htmlContent = `
      <div style="font-family: Georgia, serif; background-color: #08090c; color: #f5eed8; padding: 40px; max-width: 600px; margin: auto; border: 1px solid #c5a059;">
        <div style="text-align: center; border-bottom: 1px solid #333; padding-bottom: 20px;">
          <h1 style="letter-spacing: 5px; margin: 0; font-weight: 300;">A U R A</h1>
          <p style="font-size: 11px; letter-spacing: 3px; color: #c5a059; text-transform: uppercase;">Edinburgh • Two Michelin Stars</p>
        </div>
        <div style="padding: 30px 0;">
          <p>Dear ${reservationDetails.fullName},</p>
          <p>We are delighted to confirm your dining reservation at AURA.</p>
          <div style="background-color: #12151c; padding: 20px; border-left: 3px solid #c5a059; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Reference:</strong> ${reservationDetails.confirmationCode}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${reservationDetails.date}</p>
            <p style="margin: 5px 0;"><strong>Sitting:</strong> ${reservationDetails.timeSlot}</p>
            <p style="margin: 5px 0;"><strong>Party:</strong> ${reservationDetails.guests} Guests</p>
            <p style="margin: 5px 0;"><strong>Experience:</strong> ${reservationDetails.experience}</p>
          </div>
          <p style="font-size: 12px; color: #aaa;">Location: 14–16 Royal Terrace Vaults, Edinburgh, EH7 5TB.</p>
          <p style="font-size: 12px; color: #aaa;">Dress Code: Smart elegant attire.</p>
        </div>
        <div style="text-align: center; border-top: 1px solid #333; padding-top: 20px; font-size: 11px; color: #888;">
          Chef Patron Euan Macleod & Head Sommelier Fiona Sinclair
        </div>
      </div>
    `;

    if (this.resend) {
      try {
        await this.resend.emails.send({
          from: this.fromEmail,
          to,
          subject: `Reservation Confirmed - AURA Edinburgh (${reservationDetails.confirmationCode})`,
          html: htmlContent,
        });
        this.logger.log(`Reservation email dispatched via Resend to ${to}`);
      } catch (err) {
        this.logger.error(`Failed to dispatch email via Resend: ${(err as Error).message}`);
      }
    } else {
      this.logger.log(`[SIMULATED EMAIL] To: ${to} | Code: ${reservationDetails.confirmationCode}`);
    }
  }

  async sendContactNotification(inquiry: {
    name: string;
    email: string;
    inquiryType: string;
    message: string;
  }) {
    this.logger.log(`[CONTACT INQUIRY RECEIVED] From: ${inquiry.name} (${inquiry.email}) | Type: ${inquiry.inquiryType}`);
  }
}
