// src/auth/dto/verify.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyDto {
  @IsNotEmpty()
  @IsString()
  identifier: string; // either email or phone

  @IsNotEmpty()
  @IsString()
  code: string;
}
