import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../users/schemas/user.schema';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService
  ) {}

  async register(dto: RegisterDto) {
    const identifier = dto.email ?? dto.phone;

    let user = await this.userModel.findOne({ identifier });
    if (user) throw new UnauthorizedException('User already exists');

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    user = new this.userModel({
      identifier,
      isVerified: false,
      verificationCode,
    });

    await user.save();
    // Send code via Twilio/Email here

    return { message: 'Verification code sent.' };
  }

  async verify(dto: LoginDto) {
    const user = await this.userModel.findOne({ identifier: dto.identifier });
    if (!user || user.verificationCode !== dto.code)
      throw new UnauthorizedException('Invalid code');

    user.isVerified = true;
    await user.save();

    const payload = { sub: user._id, identifier: user.identifier };
    return { access_token: this.jwtService.sign(payload) };
  }
}
