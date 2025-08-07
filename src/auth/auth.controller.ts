import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyDto } from './dto/verify.dto';
import { LogoutDto } from './dto/logout.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { AuthThrottlerGuard } from '../common/guards/throttler.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { RegisterResponse, VerifyResponse, LoginResponse, CompleteProfileResponse, LogoutResponse } from './dto/auth-response.dto';

@ApiTags('auth')
@Controller('auth')
@UseGuards(AuthThrottlerGuard)
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user with email or phone' })
  @ApiResponse({ status: 201, description: 'User registration initiated successfully', type: RegisterResponse })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input' })
  @ApiResponse({ status: 409, description: 'Conflict - User already exists' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify OTP code sent to email or phone' })
  @ApiResponse({ status: 200, description: 'Verification successful', type: VerifyResponse })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid code' })
  verify(@Body() dto: VerifyDto) {
    return this.authService.verifyOtp(dto);
  }
  
  @Post('login')
  @ApiOperation({ summary: 'Login with identifier and password' })
  @ApiResponse({ status: 200, description: 'Login successful', type: LoginResponse })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid credentials' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('complete-profile')
  @ApiOperation({ summary: 'Complete user profile with username and password' })
  @ApiResponse({ status: 200, description: 'Profile completed successfully', type: CompleteProfileResponse })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token or user not verified' })
  @ApiResponse({ status: 409, description: 'Conflict - Username already taken' })
  completeProfile(@Request() req, @Body() dto: CompleteProfileDto) {
    return this.authService.completeProfile(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @ApiOperation({ summary: 'Logout and blacklist the token' })
  @ApiResponse({ status: 200, description: 'Logout successful', type: LogoutResponse })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid token' })
  logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto);
  }
}
