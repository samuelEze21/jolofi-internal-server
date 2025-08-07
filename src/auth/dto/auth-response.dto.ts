import { ApiProperty } from '@nestjs/swagger';

// Base response class for all auth responses
export class BaseAuthResponse {
  @ApiProperty({ description: 'Response message' })
  message: string;
}

// Response for register endpoint
export class RegisterResponse extends BaseAuthResponse {
  @ApiProperty({ description: 'Test verification code (only in development)', required: false })
  testCode?: string;
}

// User data returned in responses
export class UserDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User identifier (email or phone)' })
  identifier: string;

  @ApiProperty({ description: 'Username', required: false, nullable: true })
  username: string | null;

  @ApiProperty({ description: 'Whether the user is verified' })
  isVerified: boolean;
}

// Response for verify endpoint
export class VerifyResponse extends BaseAuthResponse {
  @ApiProperty({ description: 'JWT token' })
  token: string;

  @ApiProperty({ description: 'User data' })
  user: UserDto;
}

// Response for login endpoint
export class LoginResponse {
  @ApiProperty({ description: 'JWT token' })
  token: string;
}

// Response for complete-profile endpoint
export class CompleteProfileResponse extends BaseAuthResponse {
  @ApiProperty({ description: 'Wallet information' })
  wallet: {
    address: string;
    privateKey: string;
  };
}

// Response for logout endpoint
export class LogoutResponse extends BaseAuthResponse {}

// Response for verification code status
export class VerificationStatusResponse {
  @ApiProperty({ description: 'Verification status' })
  status: string;
}