// src/auth/dto/verify.dto.ts
export class VerifyDto {
  identifier: string; // either email or phone
  code: string;
}
