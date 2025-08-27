import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from '../src/wallet/wallet.service';
import { Logger } from '@nestjs/common';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';

// Mock the SUI.js dependencies
jest.mock('@mysten/sui.js/keypairs/ed25519', () => {
  // Create a mock keypair instance
  const mockKeypairInstance = {
    getPublicKey: jest.fn().mockReturnValue({
      toSuiAddress: jest.fn().mockReturnValue('0xmock-wallet-address'),
    }),
    export: jest.fn().mockReturnValue({
      privateKey: 'mock-private-key',
    }),
    signTransactionBlock: jest.fn(),
  };

  // Create a mock admin keypair instance
  const mockAdminKeypairInstance = {
    getPublicKey: jest.fn().mockReturnValue({
      toSuiAddress: jest.fn().mockReturnValue('0xmock-admin-address'),
    }),
    signTransactionBlock: jest.fn(),
  };

  // Create the mock constructor function with proper TypeScript typing
  function MockEd25519Keypair() {
    return mockKeypairInstance;
  }
  
  // Add the static method to the constructor function
  MockEd25519Keypair.fromSecretKey = jest.fn().mockImplementation(() => mockAdminKeypairInstance);
  
  return {
    Ed25519Keypair: MockEd25519Keypair
  };
});

// Create a mock for getBalance that can be spied on later
const mockGetBalance = jest.fn().mockResolvedValue({
  totalBalance: '1000',
});

jest.mock('@mysten/sui.js/client', () => ({
  SuiClient: jest.fn().mockImplementation(() => ({
    signAndExecuteTransactionBlock: jest.fn().mockResolvedValue({
      digest: 'mock-transaction-digest',
    }),
    getBalance: mockGetBalance,
  })),
  SuiHTTPTransport: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('@mysten/sui.js/transactions', () => ({
  TransactionBlock: jest.fn().mockImplementation(() => ({
    moveCall: jest.fn(),
    object: jest.fn().mockReturnValue('mock-object-arg'),
    pure: jest.fn().mockReturnValue('mock-pure-arg'),
  })),
}));

jest.mock('@mysten/sui.js/utils', () => ({
  fromHEX: jest.fn().mockReturnValue('mock-private-key-bytes'),
}));

// Mock environment variables
const originalEnv = process.env;
beforeEach(() => {
  jest.resetModules();
  process.env = {
    ...originalEnv,
    SUI_PRIVATE_KEY: 'mock-private-key',
    SUI_PACKAGE_ID: 'mock-package-id',
    SUI_POOL_ID: 'mock-pool-id',
    SUI_MODULE_NAME: 'jollfi_wallet',
    SUI_NETWORK_URL: 'https://mock-sui-network.io',
  };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('WalletService', () => {
  let service: WalletService;
  let mockLogger: Partial<Logger>;

  beforeEach(async () => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: Logger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    
    // Set the logger directly on the service instance
    Object.defineProperty(service, 'logger', {
      value: mockLogger
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateWallet', () => {
    it('should generate a wallet with address and private key', async () => {
      const userId = 'mock-user-id';
      const result = await service.generateWallet(userId);

      expect(result).toEqual({
        address: '0xmock-wallet-address',
        privateKey: 'mock-private-key',
      });
    });

    it('should attempt to register the wallet with the contract', async () => {
      const userId = 'mock-user-id';
      const registerSpy = jest.spyOn(service as any, 'registerWalletWithContract');
      
      await service.generateWallet(userId);
      
      expect(registerSpy).toHaveBeenCalledWith('0xmock-wallet-address', userId);
    });

    it('should return wallet even if contract registration fails', async () => {
      const userId = 'mock-user-id';
      jest.spyOn(service as any, 'registerWalletWithContract').mockRejectedValue(new Error('Contract error'));
      
      const result = await service.generateWallet(userId);
      
      expect(result).toEqual({
        address: '0xmock-wallet-address',
        privateKey: 'mock-private-key',
      });
    });
  });

  describe('registerWalletWithContract', () => {
    it('should create and execute a transaction to register the wallet', async () => {
      const walletAddress = '0xmock-wallet-address';
      const userId = 'mock-user-id';
      
      const result = await (service as any).registerWalletWithContract(walletAddress, userId);
      
      expect(TransactionBlock).toHaveBeenCalled();
      expect(result).toBe('mock-transaction-digest');
    });

    it('should throw error if admin keypair is not initialized', async () => {
      const walletAddress = '0xmock-wallet-address';
      const userId = 'mock-user-id';
      
      // Force adminKeypair to be undefined
      Object.defineProperty(service, 'adminKeypair', { value: undefined });
      
      await expect((service as any).registerWalletWithContract(walletAddress, userId))
        .rejects.toThrow('Admin keypair not initialized');
    });

    it('should throw error if required Sui configuration is missing', async () => {
      const walletAddress = '0xmock-wallet-address';
      const userId = 'mock-user-id';
      
      // Remove required env variables
      delete process.env.SUI_PACKAGE_ID;
      
      await expect((service as any).registerWalletWithContract(walletAddress, userId))
        .rejects.toThrow('Missing required Sui configuration');
    });
  });

  describe('getWalletBalance', () => {
    it('should return wallet balance as BigInt', async () => {
      const address = '0xmock-wallet-address';
      const result = await service.getWalletBalance(address);
      
      expect(result).toEqual(BigInt(1000));
    });

    it('should return 0 if balance check fails', async () => {
      const address = '0xmock-wallet-address';
      // Use the mockGetBalance function directly instead of trying to spy on prototype
      mockGetBalance.mockRejectedValueOnce(new Error('Balance error'));
      
      const result = await service.getWalletBalance(address);
      
      expect(result).toEqual(BigInt(0));
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});