// src/auth/dto/verify.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyDto {
  @ApiProperty({ description: 'Email or phone number used during registration', example: 'user@example.com' })
  @IsNotEmpty()
  @IsString()
  identifier: string; // either email or phone

  @ApiProperty({ description: 'Verification code received via SMS or email', example: '123456' })
  @IsNotEmpty()
  @IsString()
  code: string;
}
