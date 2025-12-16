import { NextResponse } from 'next/server';
import { ethers, JsonRpcProvider, Wallet } from 'ethers';
import { qieTestnetConfig } from '@/config/qieTestnetConfig';
import { QIE_CONTRACTS, QIE_NETWORKS } from '@/config/contracts';
import PYTH_ENTROPY_CONFIG from '@/config/pythEntropy.js';

/**
 * Treasury Balance API - Dual Network
 * 
 * NETWORK ARCHITECTURE:
 * - Treasury operations: Somnia Testnet (STT balance)
 * - Entropy operations: Arbitrum Sepolia (ETH for entropy fees)
 * 
 * This API returns information about both networks to provide
 * complete visibility into the casino's operational status.
 * 
 * Validates: Requirements 12.3
 */
export async function GET() {
  try {
    // Use QIE Testnet for treasury operations
    const QIE_RPC_URL = qieTestnetConfig.rpcUrls.default.http[0];
    const SOMNIA_TREASURY_PRIVATE_KEY = process.env.SOMNIA_TESTNET_TREASURY_PRIVATE_KEY || process.env.TREASURY_PRIVATE_KEY;
    
    if (!SOMNIA_TREASURY_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Treasury not configured' },
        { status: 500 }
      );
    }

    // Create provider for Somnia Testnet
    const provider = new JsonRpcProvider(SOMNIA_RPC_URL);
    
    // Create treasury wallet
    const treasuryWallet = new Wallet(SOMNIA_TREASURY_PRIVATE_KEY, provider);
    
    // Get treasury balance on Somnia
    const balance = await provider.getBalance(treasuryWallet.address);
    const balanceInSTT = ethers.formatEther(balance);
    
    // Get QIE treasury contract address
    const treasuryContractAddress = QIE_CONTRACTS[QIE_NETWORKS.TESTNET].treasury;
    
    // Get entropy network (still on Arbitrum Sepolia)
    const entropyNetwork = 'arbitrum-sepolia';
    const entropyConfig = PYTH_ENTROPY_CONFIG.getNetworkConfig(entropyNetwork);
    const entropyContractAddress = PYTH_ENTROPY_CONFIG.getEntropyContract(entropyNetwork);
    
    return NextResponse.json({
      success: true,
      treasury: {
        address: treasuryWallet.address,
        contractAddress: treasuryContractAddress,
        balance: balanceInSTT,
        balanceWei: balance.toString(),
        currency: 'STT'
      },
      network: {
        name: qieTestnetConfig.name,
        chainId: qieTestnetConfig.id,
        rpcUrl: QIE_RPC_URL,
        explorer: qieTestnetConfig.blockExplorers.default.url
      },
      entropy: {
        network: entropyConfig.name,
        chainId: entropyConfig.chainId,
        contractAddress: entropyContractAddress,
        requiredFee: "0.001" // ETH on Arbitrum Sepolia
      }
    });
    
  } catch (error) {
    console.error('❌ Treasury balance check failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check treasury balance',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

