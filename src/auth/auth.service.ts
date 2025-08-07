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
import { FirebaseService } from '../auth/firebase/firebase.service';
import { WalletService } from '../wallet/wallet.service';

import { BlacklistedToken, BlacklistedTokenDocument } from './schemas/blacklisted-token.schema';
import { LogoutDto } from './dto/logout.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
    private readonly firebaseService: FirebaseService,
    private readonly walletService: WalletService,
    @InjectModel(BlacklistedToken.name) private readonly blacklistedTokenModel: Model<BlacklistedTokenDocument>,
  ) {}


  async register(dto: RegisterDto): Promise<{ message: string }> {
    const identifier = dto.email || dto.phone;
    const channel = dto.phone ? 'sms' : 'email';
  
    if (!identifier) throw new BadRequestException('Email or phone is required');
  
    // Check MongoDB - ONLY check the identifier field
    console.log('Checking for existing user with identifier:', identifier);
    const existingUser = await this.userModel.findOne({ identifier });
    console.log('Existing user found:', existingUser);
    
    if (existingUser) throw new ConflictException('User already exists in database');
  
    try {
      // Use Firebase for both SMS and email verification
      if (channel === 'sms') {
        return await this.firebaseService.sendVerificationCode(identifier);
      } else {
        return await this.firebaseService.sendEmailVerificationCode(identifier);
      }
    } catch (error) {
      // Handle Firebase errors properly
      if (error.code === 'auth/email-already-exists' || error.code === 'auth/phone-number-already-exists') {
        throw new ConflictException('User already exists in Firebase');
      }
      throw error;
    }
  }

  async verifyOtp(dto: VerifyDto) {
    const { identifier, code } = dto;
    
    // Use Firebase for both phone and email verification
    const result = await this.firebaseService.verifyCode(identifier, code);
  
    // Find user by identifier field only
    let user = await this.userModel.findOne({ identifier });
    
    if (!user) {
      user = new this.userModel({
        identifier,
        isVerified: true,
        // Don't set phone or email fields as they don't exist in the schema
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
        identifier: user.identifier,
        username: user.username || null,
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
          { identifier: dto.identifier }
        ] 
      })
      .select('+password');
    if (!user || !user.password)
      throw new UnauthorizedException('Invalid login credentials');

    const isMatch = await bcrypt.compare(dto.code, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid password');

    const token = this.jwtService.sign({
      sub: user._id,
      identifier: user.identifier,
    });

    return { token };
  }

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
