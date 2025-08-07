import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LogoutDto {
  @ApiProperty({ description: 'JWT token to be blacklisted' })
  @IsNotEmpty()
  @IsString()
  token: string;
}