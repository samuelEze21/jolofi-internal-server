import { Injectable } from '@nestjs/common';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { SuiClient, SuiHTTPTransport } from '@mysten/sui.js/client';

@Injectable()
export class WalletService {
  private client = new SuiClient({
    transport: new SuiHTTPTransport({
      url: process.env.SUI_RPC || '',
    }),
  });

  async generateWallet(userId: string): Promise<{ address: string; privateKey: string }> {
    const keypair = new Ed25519Keypair();
    const address = keypair.getPublicKey().toSuiAddress();
    const privateKey = keypair.export().privateKey; // store securely
    // Optionally, fund wallet using testnet faucet if needed
    return { address, privateKey };
  }
}