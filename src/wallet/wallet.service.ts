import { Injectable, Logger } from '@nestjs/common';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { SuiClient, SuiHTTPTransport } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { fromHEX } from '@mysten/sui.js/utils';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  private client: SuiClient;
  private adminKeypair: Ed25519Keypair;
  
  constructor() {
    // Initialize SUI client with the network URL from env
    this.client = new SuiClient({
      transport: new SuiHTTPTransport({
        url: process.env.SUI_NETWORK_URL || 'https://fullnode.testnet.sui.io:443',
      }),
    });
    
    // Initialize admin keypair from private key
    if (process.env.SUI_PRIVATE_KEY) {
      try {
        this.adminKeypair = Ed25519Keypair.fromSecretKey(fromHEX(process.env.SUI_PRIVATE_KEY));
        this.logger.log('Admin keypair initialized successfully');
      } catch (error) {
        this.logger.error('Failed to initialize admin keypair:', error);
      }
    } else {
      this.logger.warn('SUI_PRIVATE_KEY not provided in environment variables');
    }
  }

  async generateWallet(userId: string): Promise<{ address: string; privateKey: string }> {
    // Generate a new keypair for the user
    const keypair = new Ed25519Keypair();
    const address = keypair.getPublicKey().toSuiAddress();
    const privateKey = keypair.export().privateKey; // store securely
    
    try {
      // Register the wallet with the Sui smart contract
      await this.registerWalletWithContract(address, userId);
      this.logger.log(`Wallet registered successfully for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to register wallet with contract for user ${userId}:`, error);
      // We still return the wallet even if registration fails
      // The registration can be retried later
    }
    
    return { address, privateKey };
  }
  
  private async registerWalletWithContract(walletAddress: string, userId: string): Promise<string> {
    if (!this.adminKeypair) {
      throw new Error('Admin keypair not initialized');
    }
    
    const packageId = process.env.SUI_PACKAGE_ID;
    const poolId = process.env.SUI_POOL_ID;
    const moduleName = process.env.SUI_MODULE_NAME;
    
    if (!packageId || !poolId || !moduleName) {
      throw new Error('Missing required Sui configuration');
    }
    
    // Create a transaction block to call the register_wallet function
    const tx = new TransactionBlock();
    
    // Call the register_wallet function in the smart contract
    // Adjust the function name and parameters according to your contract's interface
    tx.moveCall({
      target: `${packageId}::${moduleName}::register_wallet`,
      arguments: [
        tx.object(poolId),  // Pool ID
        tx.pure(walletAddress),  // User's wallet address
        tx.pure(userId),  // User ID for reference
      ],
    });
    
    // Sign and execute the transaction
    const result = await this.client.signAndExecuteTransactionBlock({
      signer: this.adminKeypair,
      transactionBlock: tx,
    });
    
    return result.digest;
  }
  
  async getWalletBalance(address: string): Promise<bigint> {
    try {
      const balance = await this.client.getBalance({
        owner: address,
      });
      
      return BigInt(balance.totalBalance);
    } catch (error) {
      this.logger.error(`Failed to get balance for address ${address}:`, error);
      return BigInt(0);
    }
  }
}