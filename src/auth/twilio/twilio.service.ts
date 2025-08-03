// // src/twilio/twilio.service.ts
// import { Injectable } from '@nestjs/common';
// import twilio from 'twilio';

// @Injectable()
// export class TwilioService {
//   private client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

//   async sendVerificationCode(phone: string): Promise<any> {
//     return this.client.verify.v2
//       .services(process.env.TWILIO_VERIFY_SID)
//       .verifications.create({ to: phone, channel: 'sms' });
//   }

//   async verifyCode(phone: string, code: string): Promise<any> {
//     return this.client.verify.v2
//       .services(process.env.TWILIO_VERIFY_SID)
//       .verificationChecks.create({ to: phone, code });
//   }
// }
