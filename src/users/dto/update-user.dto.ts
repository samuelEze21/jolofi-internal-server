import { IsOptional, IsString, IsEmail, IsIn, IsBoolean } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsIn(['admin', 'player'])
  role?: 'admin' | 'player';

  @IsOptional()
  @IsBoolean()
  profileComplete?: boolean;
}