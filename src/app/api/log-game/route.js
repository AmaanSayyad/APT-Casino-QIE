import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { QIEGameLogger } from '@/services/QIEGameLogger';
import { QIEGameNFT } from '@/services/QIEGameNFT';
import { transactionQueue } from '@/services/TransactionQueue';
import { qieTestnetConfig } from '@/config/qieTestnetConfig';
import { getQIEExplorerUrl, getQIENFTUrl } from '@/utils/explorerUrls';

// Game type enum
const GAME_TYPES = {
  ROULETTE: 0,
  MINES: 1,
  WHEEL: 2,
  PLINKO: 3
};

// NFT Image URL - Always use production URL for consistent NFT metadata
const NFT_IMAGE_BASE_URL = 'https://apt-casino-eta.vercel.app';
const NFT_IMAGE_URL = `${NFT_IMAGE_BASE_URL}/images/nft/nft.png`;

/**
 * POST /api/log-game
 * Log game result to QIE Testnet and mint NFT using server wallet and transaction queue
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { gameType, playerAddress, betAmount, result, payout, entropyProof } = body;

    // Validate required fields
    if (!gameType || !playerAddress || !betAmount || !result || payout === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate player address
    if (!ethers.isAddress(playerAddress)) {
      return NextResponse.json(
        { error: 'Invalid player address' },
        { status: 400 }
      );
    }

    // Validate amounts
    if (typeof betAmount !== 'number' || betAmount < 0) {
      return NextResponse.json(
        { error: 'Invalid bet amount' },
        { status: 400 }
      );
    }

    if (typeof payout !== 'number' || payout < 0) {
      return NextResponse.json(
        { error: 'Invalid payout amount' },
        { status: 400 }
      );
    }

    // Check if server private key is configured
    const serverPrivateKey = process.env.QIE_SERVER_PRIVATE_KEY;
    if (!serverPrivateKey) {
      return NextResponse.json(
        { error: 'Server private key not configured' },
        { status: 500 }
      );
    }

    console.log('🎮 Processing game result:', {
      gameType,
      playerAddress,
      betAmount,
      payout,
      hasEntropyProof: !!entropyProof
    });

    // Initialize services with server wallet
    const rpcUrl = qieTestnetConfig.rpcUrls.default.http[0];
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(serverPrivateKey, provider);

    // Set provider and signer on singleton transaction queue
    transactionQueue.setProviderAndSigner(provider, signer);

    // Prepare game log data
    const gameLogData = {
      gameType,
      playerAddress,
      betAmount,
      result,
      payout,
      entropyProof,
      nftTokenId: 0 // Will be updated after NFT minting
    };

    // Prepare NFT metadata with both standard NFT fields and game-specific data
    const multiplier = calculateMultiplier(betAmount, payout);
    const outcome = payout > 0 ? 'WIN' : 'LOSS';
    
    const nftMetadata = {
      // Standard NFT metadata fields (required by TransactionQueue)
      name: `${gameType.toUpperCase()} Game Result #${Date.now()}`,
      description: `Game result NFT for ${gameType.toUpperCase()} game. Bet: ${betAmount} QIE, Payout: ${payout} QIE, Multiplier: ${multiplier}`,
      image: NFT_IMAGE_URL, // NFT image URL
      external_url: NFT_IMAGE_BASE_URL, // Link to the casino
      attributes: [
        {
          trait_type: "Game Type",
          value: gameType.toUpperCase()
        },
        {
          trait_type: "Bet Amount",
          value: betAmount,
          display_type: "number"
        },
        {
          trait_type: "Payout",
          value: payout,
          display_type: "number"
        },
        {
          trait_type: "Multiplier",
          value: multiplier
        },
        {
          trait_type: "Outcome",
          value: outcome
        },
        {
          trait_type: "Timestamp",
          value: Date.now(),
          display_type: "date"
        }
      ],
      // Game-specific fields (used by QIEGameNFT service)
      gameType: gameType.toUpperCase(),
      betAmount,
      payout,
      multiplier,
      outcome,
      entropyTxHash: entropyProof?.transactionHash || '',
      metadataURI: '' // Will be generated as data URI with image
    };

    console.log('📝 Prepared data for blockchain operations');

    // Queue NFT minting transaction first
    const nftTransactionId = await transactionQueue.enqueue({
      type: 'NFT',
      data: {
        playerAddress,
        metadata: nftMetadata
      }
    });

    console.log('🎨 NFT minting queued:', nftTransactionId);

    // Queue game logging transaction
    const logTransactionId = await transactionQueue.enqueue({
      type: 'LOG',
      data: gameLogData
    });

    console.log('📝 Game logging queued:', logTransactionId);

    // Start processing the queue
    // Note: This is fire-and-forget - we don't wait for completion
    transactionQueue.process().catch(error => {
      console.error('❌ Queue processing error:', error);
    });

    // Return immediate response with transaction IDs
    return NextResponse.json({
      success: true,
      message: 'Game result and NFT minting queued for processing',
      transactions: {
        nft: {
          id: nftTransactionId,
          status: 'QUEUED'
        },
        log: {
          id: logTransactionId,
          status: 'QUEUED'
        }
      },
      queueSize: transactionQueue.getQueue().length,
      note: 'Transactions will be processed sequentially. Check transaction status using the provided IDs.'
    });

  } catch (error) {
    console.error('❌ Failed to process game result:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process game result',
        message: error.message,
        details: 'Could not queue game logging and NFT minting transactions.'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/log-game
 * Check transaction status by ID
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('id');

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // Get transaction status from singleton queue
    const status = await transactionQueue.getStatus(transactionId);

    if (!status) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Enhance response with explorer URLs if transaction is completed
    let enhancedResult = status.result;
    if (status.status === 'COMPLETED' && status.result) {
      if (status.type === 'LOG' && status.result.txHash) {
        enhancedResult = {
          ...status.result,
          explorerUrl: getQIEExplorerUrl(status.result.txHash)
        };
      } else if (status.type === 'NFT' && status.result.tokenId) {
        enhancedResult = {
          ...status.result,
          nftUrl: getQIENFTUrl(status.result.tokenId)
        };
      }
    }

    return NextResponse.json({
      success: true,
      transaction: {
        ...status,
        result: enhancedResult
      }
    });

  } catch (error) {
    console.error('❌ Failed to get transaction status:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get transaction status',
        message: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate multiplier from bet amount and payout
 * @param {number} betAmount - Bet amount
 * @param {number} payout - Payout amount
 * @returns {string} Multiplier as string (e.g., "2.5x")
 */
function calculateMultiplier(betAmount, payout) {
  if (betAmount === 0 || payout === 0) {
    return '0x';
  }
  
  const multiplier = payout / betAmount;
  return `${multiplier.toFixed(2)}x`;
}
