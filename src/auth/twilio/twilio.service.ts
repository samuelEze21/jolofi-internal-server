// // src/twilio/twilio.service.ts
// import { Injectable, BadRequestException } from '@nestjs/common';
// import twilio from 'twilio';

// @Injectable()
// export class TwilioService {
//   private client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

//   // Helper method to normalize phone numbers
//   private normalizePhoneNumber(phone: string): string {
//     // Remove all spaces and other non-digit characters except the leading +
//     return phone.replace(/\s+/g, '').replace(/([^\d+])/g, '');
//   }

//   async sendVerificationCode(identifier: string, type: 'sms' | 'email' = 'sms'): Promise<any> {
//     try {
//       // Normalize phone number if it's an SMS verification
//       const normalizedIdentifier = type === 'sms' ? this.normalizePhoneNumber(identifier) : identifier;
      
//       return await this.client.verify.v2
//         .services(process.env.TWILIO_VERIFY_SID || '')
//         .verifications.create({ to: normalizedIdentifier, channel: type });
//     } catch (error) {
//       throw new BadRequestException('Error sending verification code');
//     }
//   }

//   async verifyCode(identifier: string, code: string): Promise<any> {
//     try {
//       // Normalize phone number if it looks like a phone number
//       const normalizedIdentifier = identifier.includes('+') ? this.normalizePhoneNumber(identifier) : identifier;
      
//       console.log(`Verifying code for: ${normalizedIdentifier}`);
      
//       const check = await this.client.verify.v2
//         .services(process.env.TWILIO_VERIFY_SID || '')
//         .verificationChecks.create({ to: normalizedIdentifier, code });

//       console.log('Verification result:', check);
//       return check;
//     } catch (error) {
//       console.error('Verification error:', error);
//       throw new BadRequestException('Invalid code');
//     }
//   }
// }
