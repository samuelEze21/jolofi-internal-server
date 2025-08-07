import { IsEmail, IsPhoneNumber, IsNotEmpty, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: 'Phone number for registration', required: false, example: '+12345678901' })
  @IsNotEmpty()
  @ValidateIf(o => o.email === undefined)
  @IsPhoneNumber(undefined, { message: 'Invalid phone number' })
  phone?: string;

  @ApiProperty({ description: 'Email for registration', required: false, example: 'user@example.com' })
  @IsNotEmpty()
  @ValidateIf(o => o.phone === undefined)
  @IsEmail()
  email?: string;
}
