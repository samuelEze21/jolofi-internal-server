 import { IsEmail, IsPhoneNumber, IsOptional, ValidateIf } from 'class-validator';

export class RegisterDto {
  @ValidateIf(o => o.email === undefined)
  @IsPhoneNumber(null)
  phone?: string;

  @ValidateIf(o => o.phone === undefined)
  @IsEmail()
  email?: string;
}
