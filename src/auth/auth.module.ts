import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
// import { TwilioService } from './twilio/twilio.service';
import { FirebaseService } from './firebase/firebase.service'; // Add this
import { WalletService } from '../wallet/wallet.service';
import { BlacklistedToken, BlacklistedTokenSchema } from './schemas/blacklisted-token.schema';
import { ConfigModule } from '@nestjs/config'; // Add this

@Module({
  imports: [
    ConfigModule, // Add this
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: BlacklistedToken.name, schema: BlacklistedTokenSchema }
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || (() => { 
        console.error('JWT_SECRET is not defined in environment variables');
        return 'temporary_secret_for_development'; // Fallback for development only
      })(),
      signOptions: { expiresIn: process.env.JWT_EXPIRATION || '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService, 
    JwtStrategy, 
    // TwilioService, 
    FirebaseService, // Add this
    WalletService
  ],
})
export class AuthModule {}
