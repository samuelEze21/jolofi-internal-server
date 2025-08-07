import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'Email, phone number, or username', example: 'user@example.com' })
  @IsNotEmpty()
  @IsString()
  identifier: string; // email or phone

  @ApiProperty({ description: 'Password or verification code', example: 'password123' })
  @IsNotEmpty()
  @IsString()
  code: string; // OTP or email code
}
