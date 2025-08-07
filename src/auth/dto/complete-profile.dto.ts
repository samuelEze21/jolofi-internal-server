// dto/complete-profile.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompleteProfileDto {
  @ApiProperty({ description: 'Username for the account', example: 'johndoe' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: 'Password for the account', example: 'securePassword123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
