// src/twilio/twilio.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import twilio from 'twilio';

@Injectable()
export class TwilioService {
  private client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  async sendVerificationCode(identifier: string, type: 'sms' | 'email' = 'sms'): Promise<any> {
    try {
      return await this.client.verify.v2
        .services(process.env.TWILIO_VERIFY_SID || '')
        .verifications.create({ to: identifier, channel: type });
    } catch (error) {
      throw new BadRequestException('Error sending verification code');
    }
  }

  async verifyCode(identifier: string, code: string): Promise<any> {
    try {
      const check = await this.client.verify.v2
        .services(process.env.TWILIO_VERIFY_SID || '')
        .verificationChecks.create({ to: identifier, code });

      return check;
    } catch {
      throw new BadRequestException('Invalid code');
    }
  }
}
