import { IsEmail, IsPhoneNumber, IsNotEmpty, ValidateIf } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  @ValidateIf(o => o.email === undefined)
  @IsPhoneNumber(undefined, { message: 'Invalid phone number' })
  phone?: string;

  @IsNotEmpty()
  @ValidateIf(o => o.phone === undefined)
  @IsEmail()
  email?: string;
}
