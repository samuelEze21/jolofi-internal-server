import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../users/schemas/user.schema';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CompleteProfileDto } from '../auth/dto/complete-profile.dto';
import * as bcrypt from 'bcrypt';


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
      verificationCode: verificationCode,
      isVerified: false,
    });

    await user.save();

    // TODO: Send code with Twilio or Email

    return { message: 'Verification code sent.' };
  }


  async verify(dto: LoginDto) {
    const user = await this.userModel.findOne({ identifier: dto.identifier });
    if (!user || user.verificationCode !== dto.code)
      throw new UnauthorizedException('Invalid code');

    user.isVerified = true;
    await user.save();

    const token = this.jwtService.sign({ sub: user._id, identifier: user.identifier });
    return { access_token: token };
  }

  
  async completeProfile(userId: string, dto: CompleteProfileDto) {
    const existingUser = await this.userModel.findOne({ username: dto.username });
    if (existingUser) throw new ConflictException('Username taken');

    const user = await this.userModel.findById(userId);
    if (!user || !user.isVerified) throw new UnauthorizedException();

    user.username = dto.username;
    user.password = await bcrypt.hash(dto.password, 10);

    await user.save();

    // ⛓️ Call WalletService to generate Sui wallet
    // You can inject WalletService and call:
    // await this.walletService.generateWallet(user._id);

    return { message: 'Profile completed. Wallet being created...' };
  }



  async login(dto: LoginDto) {
    const user = await this.userModel.findOne({ username: dto.identifier }).select('+password');
    if (!user || !(await bcrypt.compare(dto.code, (user as any).password)))
      throw new UnauthorizedException('Invalid credentials');

    return {
      access_token: this.jwtService.sign({ sub: user._id, identifier: user.identifier }),
    };
  }
}




















//   async verify(dto: LoginDto) {
//     const user = await this.userModel.findOne({ identifier: dto.identifier });
//     if (!user || user.verificationCode !== dto.code)
//       throw new UnauthorizedException('Invalid code');

//     user.isVerified = true;
//     await user.save();

//     const payload = { sub: user._id, identifier: user.identifier };
//     return { access_token: this.jwtService.sign(payload) };
//   }
// }
