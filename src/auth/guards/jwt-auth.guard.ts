import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BlacklistedToken } from '../schemas/blacklisted-token.schema';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private jwtService: JwtService,
    @InjectModel(BlacklistedToken.name) private blacklistedTokenModel: Model<BlacklistedToken>,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get the token from the request
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    
    const token = authHeader.split(' ')[1];
    
    // Check if token is blacklisted
    const isBlacklisted = await this.blacklistedTokenModel.findOne({ token });
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }
    
    // Continue with the default JWT validation
    return (await super.canActivate(context)) as boolean;
  }
}