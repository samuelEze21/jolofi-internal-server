import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/auth/auth.service';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
// import { TwilioService } from '../src/auth/twilio/twilio.service';
import { FirebaseService } from '../src/auth/firebase/firebase.service';
import { WalletService } from '../src/wallet/wallet.service';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { RegisterDto } from '../src/auth/dto/register.dto';
import { VerifyDto } from '../src/auth/dto/verify.dto';
import { CompleteProfileDto } from '../src/auth/dto/complete-profile.dto';
import { LoginDto } from '../src/auth/dto/login.dto';
import { LogoutDto } from '../src/auth/dto/logout.dto';

// Mock bcrypt at the module level
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockImplementation((plaintext) => Promise.resolve(plaintext === 'correct-code'))
}));

import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserModel: any;
  let mockJwtService: any;
  let mockFirebaseService: any;
  let mockWalletService: any;
  let mockBlacklistedTokenModel: any;

  beforeEach(async () => {
    const mockUserInstance = {
      save: jest.fn().mockResolvedValue(true),
    };

    const UserModelMock = jest.fn().mockImplementation((userData) => {
      return Object.assign({}, mockUserInstance, userData);
    });

    mockUserModel = Object.assign(UserModelMock, {
      findOne: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    });

    mockJwtService = {
      sign: jest.fn().mockReturnValue('test-token'),
      verify: jest.fn().mockReturnValue({ sub: 'user-id', exp: Math.floor(Date.now() / 1000) + 3600 }),
    };

    mockFirebaseService = {
      sendVerificationCode: jest.fn().mockResolvedValue({ message: 'Verification code sent to +1234567890' }),
      sendEmailVerificationCode: jest.fn().mockResolvedValue({ message: 'Verification code sent to test@example.com' }),
      verifyCode: jest.fn().mockResolvedValue({ status: 'approved' }),
    };

    mockWalletService = {
      generateWallet: jest.fn().mockResolvedValue({
        address: '0xtest-wallet-address',
        privateKey: 'test-private-key',
      }),
      // Add this missing mock method
      getWalletBalance: jest.fn().mockResolvedValue(BigInt(0)),
    };

    mockBlacklistedTokenModel = {
      create: jest.fn().mockResolvedValue(true),
      findOne: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken('User'), useValue: mockUserModel },
        { provide: JwtService, useValue: mockJwtService },
        { provide: FirebaseService, useValue: mockFirebaseService },
        { provide: WalletService, useValue: mockWalletService },
        { provide: getModelToken('BlacklistedToken'), useValue: mockBlacklistedTokenModel },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });


  // 1. Register function tests
  describe('register', () => {
    it('should register a new user with email', async () => {
      const dto: RegisterDto = { email: 'test@example.com' };
      mockUserModel.findOne.mockResolvedValue(null);

      const result = await service.register(dto);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ identifier: 'test@example.com' });
      expect(mockFirebaseService.sendEmailVerificationCode).toHaveBeenCalledWith('test@example.com');
      expect(result).toEqual({ message: 'Verification code sent to test@example.com' });
    });

    it('should register a new user with phone', async () => {
      const dto: RegisterDto = { phone: '+1234567890' };
      mockUserModel.findOne.mockResolvedValue(null);

      const result = await service.register(dto);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ identifier: '+1234567890' });
      expect(mockFirebaseService.sendVerificationCode).toHaveBeenCalledWith('+1234567890');
      expect(result).toEqual({ message: 'Verification code sent to +1234567890' });
    });

    it('should throw BadRequestException if no email or phone provided', async () => {
      const dto: RegisterDto = {} as RegisterDto;

      await expect(service.register(dto)).rejects.toThrow(BadRequestException);
      expect(mockUserModel.findOne).not.toHaveBeenCalled();
      expect(mockFirebaseService.sendVerificationCode).not.toHaveBeenCalled();
      expect(mockFirebaseService.sendEmailVerificationCode).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if user already exists', async () => {
      const dto: RegisterDto = { email: 'existing@example.com' };
      mockUserModel.findOne.mockResolvedValue({ identifier: 'existing@example.com' });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(mockUserModel.findOne).toHaveBeenCalled();
      expect(mockFirebaseService.sendVerificationCode).not.toHaveBeenCalled();
      expect(mockFirebaseService.sendEmailVerificationCode).not.toHaveBeenCalled();
    });
  });



  // 2. VerifyOtp function tests
  describe('verifyOtp', () => {
    it('should verify OTP for existing user', async () => {
      const dto: VerifyDto = { identifier: 'test@example.com', code: '123456' };
      const mockUser = {
        _id: 'user-id',
        identifier: 'test@example.com',
        username: null,
        isVerified: false,
        save: jest.fn().mockResolvedValue(true),
      };
      mockUserModel.findOne.mockResolvedValue(mockUser);

      const result = await service.verifyOtp(dto);

      expect(mockFirebaseService.verifyCode).toHaveBeenCalledWith('test@example.com', '123456');
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ identifier: 'test@example.com' });
      expect(mockUser.isVerified).toBe(true);
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockJwtService.sign).toHaveBeenCalledWith({ sub: 'user-id', identifier: 'test@example.com' });
      expect(result).toEqual({
        message: 'Verification successful',
        token: 'test-token',
        user: {
          id: 'user-id',
          identifier: 'test@example.com',
          username: null,
          isVerified: true,
        },
      });
    });

    it('should create new user if not exists during OTP verification', async () => {
      const dto: VerifyDto = {
        identifier: '+1234567890',
        code: '123456',
      };

      const newUser = {
        _id: 'new-user-id',
        identifier: '+1234567890',
        isVerified: true,
        username: null,
        save: jest.fn().mockResolvedValue(true),
      };
      
      mockUserModel.findOne.mockResolvedValue(null);
      mockUserModel.mockImplementationOnce(() => newUser);

      const result = await service.verifyOtp(dto);

      expect(mockFirebaseService.verifyCode).toHaveBeenCalledWith('+1234567890', '123456');
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ identifier: '+1234567890' });
      expect(newUser.save).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.token).toBe('test-token');
    });
  });


  
  // 3. CompleteProfile function tests

  describe('completeProfile with wallet integration', () => {
    it('should complete profile and generate wallet', async () => {
      const userId = 'test-user-id';
      const dto: CompleteProfileDto = {
        username: 'testuser',
        password: 'password123',
      };
      
      const mockUser = {
        _id: userId,
        identifier: 'test@example.com',
        isVerified: true,
        username: null,
        password: null,
        suiWalletAddress: null,
        save: jest.fn().mockResolvedValue(true),
      };
      
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUserModel.findOne.mockResolvedValue(null); // No existing username
      
      const result = await service.completeProfile(userId, dto);
      
      expect(mockWalletService.generateWallet).toHaveBeenCalledWith(userId);
      expect(mockUser.suiWalletAddress).toBe('0xtest-wallet-address');
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Profile completed',
        wallet: {
          address: '0xtest-wallet-address',
          balance: '0'
        }
      });
    });
    
    it('should handle wallet balance retrieval', async () => {
      const userId = 'test-user-id';
      const dto: CompleteProfileDto = {
        username: 'testuser',
        password: 'password123',
      };
      
      const mockUser = {
        _id: userId,
        identifier: 'test@example.com',
        isVerified: true,
        username: null,
        password: null,
        suiWalletAddress: null,
        save: jest.fn().mockResolvedValue(true),
      };
      
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUserModel.findOne.mockResolvedValue(null); // No existing username
      
      // Mock wallet balance retrieval
      mockWalletService.getWalletBalance = jest.fn().mockResolvedValue(BigInt(1000));
      
      const result = await service.completeProfile(userId, dto);
      
      expect(mockWalletService.getWalletBalance).toHaveBeenCalledWith('0xtest-wallet-address');
      expect(result.wallet.balance).toBe('1000');
    });
    
    it('should handle wallet balance retrieval failure', async () => {
      const userId = 'test-user-id';
      const dto: CompleteProfileDto = {
        username: 'testuser',
        password: 'password123',
      };
      
      const mockUser = {
        _id: userId,
        identifier: 'test@example.com',
        isVerified: true,
        username: null,
        password: null,
        suiWalletAddress: null,
        save: jest.fn().mockResolvedValue(true),
      };
      
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUserModel.findOne.mockResolvedValue(null); // No existing username
      
      // Mock wallet balance retrieval failure
      mockWalletService.getWalletBalance = jest.fn().mockRejectedValue(new Error('Balance error'));
      
      // Mock console.error to prevent test output pollution
      const originalConsoleError = console.error;
      console.error = jest.fn();
      
      const result = await service.completeProfile(userId, dto);
      
      expect(console.error).toHaveBeenCalled();
      expect(result.wallet.balance).toBe('0');
      
      // Restore console.error
      console.error = originalConsoleError;
    });
  });



  
  // 4. Login function tests
  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      const dto: LoginDto = { identifier: 'testuser', code: 'correct-code' };
      const mockUser = {
        _id: 'user-id',
        username: 'testuser',
        identifier: 'test@example.com',
        password: 'hashed-password',
      };
      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.login(dto);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        $or: [
          { username: 'testuser' },
          { identifier: 'testuser' },
        ],
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('correct-code', 'hashed-password');
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'user-id',
        identifier: 'test@example.com',
      });
      expect(result).toEqual({ token: 'test-token' });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const dto: LoginDto = { identifier: 'nonexistent', code: 'any-code' };
      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(mockUserModel.findOne).toHaveBeenCalled();
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const dto: LoginDto = { identifier: 'testuser', code: 'wrong-code' };
      const mockUser = {
        _id: 'user-id',
        username: 'testuser',
        password: 'hashed-password',
      };
      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(mockUserModel.findOne).toHaveBeenCalled();
      expect(bcrypt.compare).toHaveBeenCalled();
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user has no password', async () => {
      const dto: LoginDto = { identifier: 'testuser', code: 'any-code' };
      const mockUser = {
        _id: 'user-id',
        username: 'testuser',
        password: null,
      };
      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(mockUserModel.findOne).toHaveBeenCalled();
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });
  });


  // 5. Logout function tests
  describe('logout', () => {
    it('should blacklist a valid token successfully', async () => {
      const dto: LogoutDto = { token: 'valid-token' };
      const decodedToken = { sub: 'user-id', exp: Math.floor(Date.now() / 1000) + 3600 };
      mockJwtService.verify.mockReturnValue(decodedToken);
      
      const result = await service.logout(dto);
      
      expect(mockJwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(mockBlacklistedTokenModel.create).toHaveBeenCalledWith({
        token: 'valid-token',
        expiresAt: expect.any(Date),
      });
      expect(result).toEqual({ message: 'Logout successful' });
    });
    
    it('should handle invalid tokens gracefully', async () => {
      const dto: LogoutDto = { token: 'invalid-token' };
      mockJwtService.verify.mockImplementation(() => {
        throw { name: 'JsonWebTokenError' };
      });
      
      const result = await service.logout(dto);
      
      expect(mockJwtService.verify).toHaveBeenCalledWith('invalid-token');
      expect(mockBlacklistedTokenModel.create).not.toHaveBeenCalled();
      expect(result).toEqual({ message: 'Logout successful' });
    });
    
    it('should handle expired tokens gracefully', async () => {
      const dto: LogoutDto = { token: 'expired-token' };
      mockJwtService.verify.mockImplementation(() => {
        throw { name: 'TokenExpiredError' };
      });
      
      const result = await service.logout(dto);
      
      expect(mockJwtService.verify).toHaveBeenCalledWith('expired-token');
      expect(mockBlacklistedTokenModel.create).not.toHaveBeenCalled();
      expect(result).toEqual({ message: 'Logout successful' });
    });
    
    it('should propagate unexpected errors', async () => {
      const dto: LogoutDto = { token: 'problematic-token' };
      const unexpectedError = new Error('Unexpected error');
      mockJwtService.verify.mockImplementation(() => {
        throw unexpectedError;
      });
      
      await expect(service.logout(dto)).rejects.toThrow(unexpectedError);
      expect(mockJwtService.verify).toHaveBeenCalledWith('problematic-token');
      expect(mockBlacklistedTokenModel.create).not.toHaveBeenCalled();
    });
  });
});
