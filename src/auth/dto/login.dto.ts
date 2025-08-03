import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsNotEmpty()
  @IsString()
  identifier: string; // email or phone

  @IsNotEmpty()
  @IsString()
  code: string; // OTP or email code
}
