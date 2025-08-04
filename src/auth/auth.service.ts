import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { User, UserDocument } from '../users/schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { VerifyDto } from './dto/verify.dto';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { LoginDto } from './dto/login.dto';
import { TwilioService } from '../auth/twilio/twilio.service';
import { WalletService } from '../wallet/wallet.service';

// Add these imports at the top
import { BlacklistedToken, BlacklistedTokenDocument } from './schemas/blacklisted-token.schema';
import { LogoutDto } from './dto/logout.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
    private readonly twilioService: TwilioService,
    private readonly walletService: WalletService,
    // Add this to the constructor
    @InjectModel(BlacklistedToken.name) private readonly blacklistedTokenModel: Model<BlacklistedTokenDocument>,
  ) {}


  async register(dto: RegisterDto): Promise<{ message: string }> {
    const identifier = dto.email || dto.phone;
    const channel = dto.phone ? 'sms' : 'email';

    if (!identifier) throw new BadRequestException('Email or phone is required');

    const existingUser = await this.userModel.findOne({
      $or: [{ email: dto.email }, { phone: dto.phone }],
    });
    if (existingUser) throw new ConflictException('User already exists');

    await this.twilioService.sendVerificationCode(identifier, channel);

    return { message: `Verification code sent to ${identifier}` };
  }




  async verifyOtp(dto: VerifyDto) {
    const { identifier, code } = dto;

    const result: { status?: string; [key: string]: any } = await this.twilioService.verifyCode(identifier, code);

    let user = await this.userModel.findOne({
      $or: [{ phone: identifier }, { email: identifier }],
    });

    if (!user) {
      user = new this.userModel({
        identifier,
        phone: /^\d+$/.test(identifier) ? identifier : undefined,
        email: identifier.includes('@') ? identifier : undefined,
        isVerified: true,
      });
      await user.save();
    } else {
      user.isVerified = true;
      await user.save();
    }

    const token = this.jwtService.sign({ sub: user._id, identifier });

    return {
      message: 'Verification successful',
      token,
      user: {
        id: user._id,
        email: (user as any).email || null,
        phone: (user as any).phone || null,
        username: (user as any).username || null,
        isVerified: user.isVerified
      },
    };
  }

  async completeProfile(userId: string, dto: CompleteProfileDto) {
    const user = await this.userModel.findById(userId);
    if (!user || !user.isVerified) {
      throw new UnauthorizedException('User not verified');
    }

    const existingUsername = await this.userModel.findOne({ username: dto.username });
    if (existingUsername) throw new ConflictException('Username already taken');

    user.username = dto.username;
    user.password = await bcrypt.hash(dto.password, 10);

    // Generate wallet
    const wallet = await this.walletService.generateWallet(user._id?.toString() ?? '');
    user.suiWalletAddress = wallet?.address || undefined;

    await user.save();

    return { message: 'Profile completed', wallet };
  }

  async login(dto: LoginDto) {
    const user = await this.userModel
      .findOne({ 
        $or: [
          { username: dto.identifier },
          { email: dto.identifier },
          { phone: dto.identifier }
        ] 
      })
      .select('+password');
    if (!user || !user.password)
      throw new UnauthorizedException('Invalid login credentials');

    const isMatch = await bcrypt.compare(dto.code, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid password');

    const token = this.jwtService.sign({
      sub: user._id,
      identifier: (user as any).username || (user as any).email || (user as any).phone,
    });

    return { token };
  }

  // Add this method to the AuthService class
  async logout(dto: LogoutDto): Promise<{ message: string }> {
    try {
      // Verify and decode the token
      const decoded = this.jwtService.verify(dto.token);
      
      // Calculate expiration date from the token's exp claim
      const expiresAt = new Date(decoded.exp * 1000);
      
      // Add token to blacklist
      await this.blacklistedTokenModel.create({
        token: dto.token,
        expiresAt,
      });
      
      return { message: 'Logout successful' };
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        // If token is invalid or already expired, just return success
        return { message: 'Logout successful' };
      }
      throw error;
    }
  }
}
