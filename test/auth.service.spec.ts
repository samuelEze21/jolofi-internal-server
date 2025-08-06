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

// Mock bcrypt at the module level instead of using spyOn
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockImplementation((plaintext) => Promise.resolve(plaintext === 'correct-code'))
}));

// Import bcrypt after mocking
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserModel: any;
  let mockJwtService: any;
  let mockFirebaseService: any;
  let mockWalletService: any;
  let mockBlacklistedTokenModel: any;

  beforeEach(async () => {
    // Create mock methods that will be used on the user instance
    const mockUserInstance = {
      save: jest.fn().mockResolvedValue(true),
    };

    // Create a constructor function that returns the mock instance
    const UserModelMock = jest.fn().mockImplementation((userData) => {
      return Object.assign({}, mockUserInstance, userData);
    });

    // Add the static methods to the constructor function
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
      // Arrange
      const dto: RegisterDto = { email: 'test@example.com' };
      mockUserModel.findOne.mockResolvedValue(null);

      // Act
      const result = await service.register(dto);

      // Assert
      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        $or: [{ email: dto.email }, { phone: undefined }],
      });
      expect(mockFirebaseService.sendEmailVerificationCode).toHaveBeenCalledWith('test@example.com');
      expect(result).toEqual({ message: 'Verification code sent to test@example.com' });
    });

    it('should register a new user with phone', async () => {
      // Arrange
      const dto: RegisterDto = { phone: '+1234567890' };
      mockUserModel.findOne.mockResolvedValue(null);

      // Act
      const result = await service.register(dto);

      // Assert
      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        $or: [{ email: undefined }, { phone: dto.phone }],
      });
      expect(mockFirebaseService.sendVerificationCode).toHaveBeenCalledWith('+1234567890');
      expect(result).toEqual({ message: 'Verification code sent to +1234567890' });
    });

    it('should throw BadRequestException if no email or phone provided', async () => {
      // Arrange
      const dto: RegisterDto = {} as RegisterDto;

      // Act & Assert
      await expect(service.register(dto)).rejects.toThrow(BadRequestException);
      expect(mockUserModel.findOne).not.toHaveBeenCalled();
      expect(mockFirebaseService.sendVerificationCode).not.toHaveBeenCalled();
      expect(mockFirebaseService.sendEmailVerificationCode).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if user already exists', async () => {
      // Arrange
      const dto: RegisterDto = { email: 'existing@example.com' };
      mockUserModel.findOne.mockResolvedValue({ email: 'existing@example.com' });

      // Act & Assert
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(mockUserModel.findOne).toHaveBeenCalled();
      expect(mockFirebaseService.sendVerificationCode).not.toHaveBeenCalled();
      expect(mockFirebaseService.sendEmailVerificationCode).not.toHaveBeenCalled();
    });
  });



  // 2. VerifyOtp function tests
  describe('verifyOtp', () => {
    it('should verify OTP for existing user', async () => {
      // Arrange
      const dto: VerifyDto = { identifier: 'test@example.com', code: '123456' };
      const mockUser = {
        _id: 'user-id',
        email: 'test@example.com',
        phone: null,
        username: null,
        isVerified: false,
        save: jest.fn().mockResolvedValue(true),
      };
      mockUserModel.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.verifyOtp(dto);

      // Assert
      expect(mockFirebaseService.verifyCode).toHaveBeenCalledWith('test@example.com', '123456');
      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        $or: [{ phone: 'test@example.com' }, { email: 'test@example.com' }],
      });
      expect(mockUser.isVerified).toBe(true);
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockJwtService.sign).toHaveBeenCalledWith({ sub: 'user-id', identifier: 'test@example.com' });
      expect(result).toEqual({
        message: 'Verification successful',
        token: 'test-token',
        user: {
          id: 'user-id',
          email: 'test@example.com',
          phone: null,
          username: null,
          isVerified: true,
        },
      });
    });

    // verify SMS otp
    it('should create new user if not exists during OTP verification', async () => {
      // Arrange
      const dto: VerifyDto = {
        identifier: '+1234567890',
        code: '123456',
      };

      const newUser = {
        _id: 'new-user-id',
        identifier: '+1234567890',
        phone: '+1234567890',
        email: undefined,
        isVerified: true,
        save: jest.fn().mockResolvedValue(true),
      };
      
      // Mock findOne to return null (user not found)
      mockUserModel.findOne.mockResolvedValue(null);
      
      // This is important - make the constructor return our newUser
      mockUserModel.mockImplementationOnce(() => newUser);

      // Act
      const result = await service.verifyOtp(dto);

      // Assert
      expect(mockFirebaseService.verifyCode).toHaveBeenCalledWith('+1234567890', '123456');
      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        $or: [{ phone: '+1234567890' }, { email: '+1234567890' }],
      });
      expect(newUser.save).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.token).toBe('test-token');
    });
  });


  
  // 3. CompleteProfile function tests
  describe('completeProfile', () => {
    it('should complete user profile successfully', async () => {
      // Arrange
      const userId = 'user-id';
      const dto: CompleteProfileDto = { username: 'testuser', password: 'password123' };
      const mockUser = {
        _id: userId,
        isVerified: true,
        username: undefined,
        password: undefined,
        suiWalletAddress: undefined,
        save: jest.fn().mockResolvedValue(true),
      };
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUserModel.findOne.mockResolvedValue(null); // No existing username

      // Act
      const result = await service.completeProfile(userId, dto);

      // Assert
      expect(mockUserModel.findById).toHaveBeenCalledWith(userId);
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ username: 'testuser' });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockWalletService.generateWallet).toHaveBeenCalledWith(userId);
      expect(mockUser.username).toBe('testuser');
      expect(mockUser.password).toBe('hashed-password');
      expect(mockUser.suiWalletAddress).toBe('0xtest-wallet-address');
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Profile completed',
        wallet: {
          address: '0xtest-wallet-address',
          privateKey: 'test-private-key',
        },
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Arrange
      const userId = 'non-existent-id';
      const dto: CompleteProfileDto = { username: 'testuser', password: 'password123' };
      mockUserModel.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.completeProfile(userId, dto)).rejects.toThrow(UnauthorizedException);
      expect(mockUserModel.findById).toHaveBeenCalledWith(userId);
      expect(mockUserModel.findOne).not.toHaveBeenCalled();
      expect(mockWalletService.generateWallet).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user not verified', async () => {
      // Arrange
      const userId = 'user-id';
      const dto: CompleteProfileDto = { username: 'testuser', password: 'password123' };
      const mockUser = {
        _id: userId,
        isVerified: false,
      };
      mockUserModel.findById.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.completeProfile(userId, dto)).rejects.toThrow(UnauthorizedException);
      expect(mockUserModel.findById).toHaveBeenCalledWith(userId);
      expect(mockUserModel.findOne).not.toHaveBeenCalled();
      expect(mockWalletService.generateWallet).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if username already taken', async () => {
      // Arrange
      const userId = 'user-id';
      const dto: CompleteProfileDto = { username: 'existinguser', password: 'password123' };
      const mockUser = {
        _id: userId,
        isVerified: true,
      };
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockUserModel.findOne.mockResolvedValue({ username: 'existinguser' }); // Username exists

      // Act & Assert
      await expect(service.completeProfile(userId, dto)).rejects.toThrow(ConflictException);
      expect(mockUserModel.findById).toHaveBeenCalledWith(userId);
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ username: 'existinguser' });
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockWalletService.generateWallet).not.toHaveBeenCalled();
    });
  });

  // 4. Login function tests
  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      // Arrange
      const dto: LoginDto = { identifier: 'testuser', code: 'correct-code' };
      const mockUser = {
        _id: 'user-id',
        username: 'testuser',
        email: 'test@example.com',
        phone: '+1234567890',
        password: 'hashed-password',
      };
      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      // Act
      const result = await service.login(dto);

      // Assert
      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        $or: [
          { username: 'testuser' },
          { email: 'testuser' },
          { phone: 'testuser' },
        ],
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('correct-code', 'hashed-password');
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'user-id',
        identifier: 'testuser',
      });
      expect(result).toEqual({ token: 'test-token' });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Arrange
      const dto: LoginDto = { identifier: 'nonexistent', code: 'any-code' };
      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      // Act & Assert
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(mockUserModel.findOne).toHaveBeenCalled();
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      // Arrange
      const dto: LoginDto = { identifier: 'testuser', code: 'wrong-code' };
      const mockUser = {
        _id: 'user-id',
        username: 'testuser',
        password: 'hashed-password',
      };
      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      // Act & Assert
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(mockUserModel.findOne).toHaveBeenCalled();
      expect(bcrypt.compare).toHaveBeenCalled();
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user has no password', async () => {
      // Arrange
      const dto: LoginDto = { identifier: 'testuser', code: 'any-code' };
      const mockUser = {
        _id: 'user-id',
        username: 'testuser',
        password: null,
      };
      mockUserModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      // Act & Assert
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(mockUserModel.findOne).toHaveBeenCalled();
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });
  });


  // 5. Logout function tests
  describe('logout', () => {
    it('should blacklist a valid token successfully', async () => {
      // Arrange
      const dto: LogoutDto = { token: 'valid-token' };
      const decodedToken = { sub: 'user-id', exp: Math.floor(Date.now() / 1000) + 3600 };
      mockJwtService.verify.mockReturnValue(decodedToken);
      
      // Act
      const result = await service.logout(dto);
      
      // Assert
      expect(mockJwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(mockBlacklistedTokenModel.create).toHaveBeenCalledWith({
        token: 'valid-token',
        expiresAt: expect.any(Date),
      });
      expect(result).toEqual({ message: 'Logout successful' });
    });
    
    it('should handle invalid tokens gracefully', async () => {
      // Arrange
      const dto: LogoutDto = { token: 'invalid-token' };
      mockJwtService.verify.mockImplementation(() => {
        throw { name: 'JsonWebTokenError' };
      });
      
      // Act
      const result = await service.logout(dto);
      
      // Assert
      expect(mockJwtService.verify).toHaveBeenCalledWith('invalid-token');
      expect(mockBlacklistedTokenModel.create).not.toHaveBeenCalled();
      expect(result).toEqual({ message: 'Logout successful' });
    });
    
    it('should handle expired tokens gracefully', async () => {
      // Arrange
      const dto: LogoutDto = { token: 'expired-token' };
      mockJwtService.verify.mockImplementation(() => {
        throw { name: 'TokenExpiredError' };
      });
      
      // Act
      const result = await service.logout(dto);
      
      // Assert
      expect(mockJwtService.verify).toHaveBeenCalledWith('expired-token');
      expect(mockBlacklistedTokenModel.create).not.toHaveBeenCalled();
      expect(result).toEqual({ message: 'Logout successful' });
    });
    
    it('should propagate unexpected errors', async () => {
      // Arrange
      const dto: LogoutDto = { token: 'problematic-token' };
      const unexpectedError = new Error('Unexpected error');
      mockJwtService.verify.mockImplementation(() => {
        throw unexpectedError;
      });
      
      // Act & Assert
      await expect(service.logout(dto)).rejects.toThrow(unexpectedError);
      expect(mockJwtService.verify).toHaveBeenCalledWith('problematic-token');
      expect(mockBlacklistedTokenModel.create).not.toHaveBeenCalled();
    });
  });
});
