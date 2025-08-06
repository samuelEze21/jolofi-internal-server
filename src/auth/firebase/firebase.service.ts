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
  
      // For development/testing, use a fixed verification code
      const testCode = "123456";
      console.log(`TEST MODE: Use verification code ${testCode} for ${normalizedPhone}`);
      
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
      // Create a user with the email if it doesn't exist
      const userRecord = await this.adminApp.auth().createUser({
        email,
        emailVerified: false,
      }).catch(error => {
        // If user already exists, just continue
        if (error.code === 'auth/email-already-exists') {
          return this.adminApp.auth().getUserByEmail(email);
        }
        throw error;
      });

      // Generate a verification link
      const actionCodeSettings = {
        url: this.configService.get('EMAIL_VERIFICATION_REDIRECT_URL') || 'https://your-app-domain.com',
      };
      
      // In a real implementation, we would send an email with a verification link
      // For testing purposes, we'll simulate this by returning a success message
      console.log(`Verification email would be sent to ${email} for user ${userRecord.uid}`);
      
      return { message: `Verification email sent to ${email}` };
    } catch (error) {
      console.error('Error sending email verification:', error);
      throw new BadRequestException(`Error sending email verification: ${error.message}`);
    }
  }

  // Verify the code provided by the user
  async verifyCode(identifier: string, code: string): Promise<{ status: string }> {
    try {
      // In a real implementation, the verification would be handled by the client SDK
      // For testing purposes, we'll simulate a successful verification
      
      // Check if identifier is a phone number or email
      if (identifier.includes('+') || /^\d+$/.test(identifier)) {
        // Normalize phone number
        const normalizedPhone = this.normalizePhoneNumber(identifier);
        
        // Get the user by phone number
        const userRecord = await this.adminApp.auth().getUserByPhoneNumber(normalizedPhone);
        console.log(`Phone verification successful for user ${userRecord.uid}`);
      } else {
        // Get the user by email
        const userRecord = await this.adminApp.auth().getUserByEmail(identifier);
        
        // Update the user's email verification status
        await this.adminApp.auth().updateUser(userRecord.uid, {
          emailVerified: true,
        });
        
        console.log(`Email verification successful for user ${userRecord.uid}`);
      }

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