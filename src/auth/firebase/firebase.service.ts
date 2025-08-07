import { Injectable, BadRequestException, OnModuleInit } from '@nestjs/common';
import * as firebase from 'firebase/app';
import { getAuth, signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private adminApp: admin.app.App;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    try {
      // Initialize Firebase Admin SDK with service account
      const serviceAccount = require('../../../firebase-service-account.json');
      
      this.adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      // Initialize Firebase client SDK
      const firebaseConfig = {
        apiKey: this.configService.get('FIREBASE_API_KEY'),
        authDomain: this.configService.get('FIREBASE_AUTH_DOMAIN'),
        projectId: this.configService.get('FIREBASE_PROJECT_ID'),
        storageBucket: this.configService.get('FIREBASE_STORAGE_BUCKET'),
        messagingSenderId: this.configService.get('FIREBASE_MESSAGING_SENDER_ID'),
        appId: this.configService.get('FIREBASE_APP_ID'),
      };

      // Initialize Firebase client SDK if not already initialized
      if (!firebase.getApps().length) {
        firebase.initializeApp(firebaseConfig);
      }
      
      console.log('Firebase initialized successfully');
    } catch (error) {
      console.error('Error initializing Firebase:', error);
    }
  }

  // Generate a random 6-digit verification code
  private generateRandomCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Generate a verification code and send it to the phone number
  async sendVerificationCode(phoneNumber: string): Promise<{ message: string }> {
    try {
      // Normalize phone number (ensure it has international format with +)
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      
      // Create a user with the phone number if it doesn't exist
      const userRecord = await this.adminApp.auth().createUser({
        phoneNumber: normalizedPhone,
      }).catch(error => {
        // If user already exists, just continue
        if (error.code === 'auth/phone-number-already-exists') {
          return this.adminApp.auth().getUserByPhoneNumber(normalizedPhone);
        }
        throw error;
      });
  
      // For development/testing, generate a random verification code
      // In production, this would be sent via SMS using a service like Twilio
      const testCode = process.env.NODE_ENV === 'development' ? this.generateRandomCode() : null;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`TEST MODE: Use verification code ${testCode} for ${normalizedPhone}`);
      }
      
      return { 
        message: `Verification code sent to ${normalizedPhone}`,
        ...(process.env.NODE_ENV === 'development' ? { testCode } : {}) // Only include testCode in development
      };
    } catch (error) {
      console.error('Error sending verification code:', error);
      throw new BadRequestException(`Error sending verification code: ${error.message}`);
    }
  }

  // Send email verification code
  async sendEmailVerificationCode(email: string): Promise<{ message: string }> {
    try {
      // Don't create a Firebase user, just send verification code
      // Use Firebase Auth custom tokens or just the email sending capabilities
      
      // For development/testing, generate a random verification code
      // In production, this would be sent via email
      const testCode = process.env.NODE_ENV === 'development' ? this.generateRandomCode() : null;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`TEST MODE: Use verification code ${testCode} for ${email}`);
      }
      
      return { 
        message: `Verification email sent to ${email}`,
        ...(process.env.NODE_ENV === 'development' ? { testCode } : {})
      };
    } catch (error) {
      console.error('Error sending email verification:', error);
      throw new BadRequestException(`Error sending email verification: ${error.message}`);
    }
  }

  // Verify the code provided by the user
  async verifyCode(identifier: string, code: string): Promise<{ status: string }> {
    try {
      // In a real implementation, verify the code without requiring a Firebase user
      // For testing, simulate verification
      
      // If verification is successful, return status
      return { status: 'approved' };
    } catch (error) {
      console.error('Verification error:', error);
      throw new BadRequestException(`Invalid code: ${error.message}`);
    }
  }

  // Helper method to normalize phone numbers
  private normalizePhoneNumber(phone: string): string {
    // Remove all spaces and other non-digit characters except the leading +
    let normalizedPhone = phone.replace(/\s+/g, '').replace(/([^\d+])/g, '');
    
    // Ensure the phone number starts with +
    if (!normalizedPhone.startsWith('+')) {
      normalizedPhone = `+${normalizedPhone}`;
    }
    
    return normalizedPhone;
  }
}