import { ethers } from 'ethers';
import { QIE_CONTRACTS, QIE_NETWORKS, QIE_EXPLORER_URLS } from '../config/contracts';
import { qieTestnetConfig } from '../config/qieTestnetConfig';
import { getQIENFTUrl } from '../utils/explorerUrls';

// Game NFT Contract ABI (minimal interface)
const GAME_NFT_ABI = [
  // Events
  'event GameNFTMinted(uint256 indexed tokenId, address indexed player, string gameType, uint256 betAmount, uint256 payout, bool isWin, uint256 timestamp)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  
  // Functions
  'function mintGameNFT(address player, string memory gameType, uint256 betAmount, uint256 payout, string memory multiplier, bool isWin, string memory entropyTxHash, string memory metadataURI) external returns (uint256 tokenId)',
  'function getNFTMetadata(uint256 tokenId) external view returns (tuple(uint256 tokenId, address player, string gameType, uint256 betAmount, uint256 payout, string multiplier, bool isWin, uint256 timestamp, string entropyTxHash, string metadataURI))',
  'function getPlayerNFTs(address player) external view returns (uint256[] memory)',
  'function getPlayerNFTCount(address player) external view returns (uint256)',
  'function tokenURI(uint256 tokenId) external view returns (string memory)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function getCurrentTokenId() external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function addAuthorizedMinter(address minter) external',
  'function isAuthorizedMinter(address minter) external view returns (bool)'
];

/**
 * QIE Game NFT Service
 * Handles minting and managing game result NFTs on QIE Blockchain Testnet
 */
export class QIEGameNFT {
  constructor(provider = null, signer = null) {
    this.provider = provider;
    this.signer = signer;
    this.contract = null;
    this.network = QIE_NETWORKS.TESTNET;
    this.contractAddress = QIE_CONTRACTS[this.network].gameNFT;
    this.explorerUrl = QIE_EXPLORER_URLS[this.network];
    
    // Initialize server wallet if private key is available
    if (typeof window === 'undefined' && process.env.QIE_SERVER_PRIVATE_KEY) {
      this.initializeServerWallet();
    }
    
    if (this.provider && this.contractAddress) {
      this.initializeContract();
    }
  }

  /**
   * Initialize server wallet for backend operations
   */
  initializeServerWallet() {
    try {
      const rpcUrl = qieTestnetConfig.rpcUrls.default.http[0];
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.signer = new ethers.Wallet(process.env.QIE_SERVER_PRIVATE_KEY, this.provider);
      
      console.log('✅ QIE NFT Server wallet initialized:', this.signer.address);
    } catch (error) {
      console.error('❌ Failed to initialize QIE NFT server wallet:', error);
      throw error;
    }
  }

  /**
   * Initialize the contract instance
   */
  initializeContract() {
    try {
      if (!this.contractAddress || this.contractAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('QIE Game NFT contract address not configured');
      }

      const signerOrProvider = this.signer || this.provider;
      this.contract = new ethers.Contract(
        this.contractAddress,
        GAME_NFT_ABI,
        signerOrProvider
      );

      console.log('✅ QIE Game NFT initialized:', this.contractAddress);
    } catch (error) {
      console.error('❌ Failed to initialize QIE Game NFT contract:', error);
      throw error;
    }
  }

  /**
   * Set provider and signer
   * @param {ethers.Provider} provider - Ethers provider
   * @param {ethers.Signer} signer - Ethers signer
   */
  setProviderAndSigner(provider, signer) {
    this.provider = provider;
    this.signer = signer;
    this.initializeContract();
  }

  /**
   * Mint a game NFT with retry logic
   * @param {string} playerAddress - Player's wallet address
   * @param {Object} metadata - NFT metadata object
   * @returns {Promise<Object>} Mint result with transaction hash and token ID
   */
  async mintGameNFT(playerAddress, metadata) {
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🎨 Minting NFT attempt ${attempt}/${maxRetries} for player:`, playerAddress);
        
        const result = await this._mintGameNFTInternal(playerAddress, metadata);
        
        console.log('✅ NFT minted successfully:', {
          tokenId: result.tokenId,
          txHash: result.txHash,
          attempt
        });
        
        return result;

      } catch (error) {
        lastError = error;
        console.error(`❌ NFT mint attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    console.error('❌ All NFT mint attempts failed:', lastError);
    throw new Error(`NFT minting failed after ${maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Internal method to mint NFT (single attempt)
   * @param {string} playerAddress - Player's wallet address
   * @param {Object} metadata - NFT metadata object
   * @returns {Promise<Object>} Mint result
   * @private
   */
  async _mintGameNFTInternal(playerAddress, metadata) {
    try {
      if (!this.contract) {
        throw new Error('QIE Game NFT contract not initialized');
      }

      if (!this.signer) {
        throw new Error('Signer required to mint NFTs');
      }

      // Validate inputs
      this.validateMintInputs(playerAddress, metadata);

      const {
        gameType,
        betAmount,
        payout,
        multiplier,
        outcome,
        entropyTxHash = '',
        metadataURI: providedMetadataURI = '',
        image = '',
        name = '',
        description = '',
        external_url = ''
      } = metadata;

      // Generate metadataURI with image if not provided
      let metadataURI = providedMetadataURI;
      if (!metadataURI && image) {
        // Create a proper metadata JSON with image
        const metadataJson = {
          name: name || `${gameType} Game Result`,
          description: description || `Game result NFT for ${gameType} game`,
          image: image,
          external_url: external_url || '',
          attributes: [
            { trait_type: 'Game Type', value: gameType },
            { trait_type: 'Bet Amount', value: `${betAmount} QIE` },
            { trait_type: 'Payout', value: `${payout} QIE` },
            { trait_type: 'Multiplier', value: multiplier },
            { trait_type: 'Outcome', value: outcome },
            { trait_type: 'Entropy TX', value: entropyTxHash }
          ]
        };

        // Encode as base64 data URI (use Buffer for Node.js environment)
        const jsonString = JSON.stringify(metadataJson);
        let base64;
        if (typeof Buffer !== 'undefined') {
          base64 = Buffer.from(jsonString).toString('base64');
        } else {
          base64 = btoa(unescape(encodeURIComponent(jsonString)));
        }
        metadataURI = `data:application/json;base64,${base64}`;

        console.log('🖼️ Generated metadataURI with image:', image);
        console.log('📋 MetadataURI length:', metadataURI.length);
      } else {
        console.log('⚠️ MetadataURI not generated - providedMetadataURI:', providedMetadataURI, 'image:', image);
      }

      // Convert amounts to wei
      const betAmountWei = ethers.parseEther(betAmount.toString());
      const payoutWei = ethers.parseEther(payout.toString());

      // Determine if it's a win
      const isWin = outcome === 'WIN' || outcome === 'win' || outcome === true;

      console.log('🎨 Minting NFT with data:', {
        playerAddress,
        gameType,
        betAmount: betAmountWei.toString(),
        payout: payoutWei.toString(),
        multiplier,
        isWin,
        entropyTxHash,
        metadataURILength: metadataURI?.length || 0,
        hasMetadataURI: !!metadataURI
      });

      // Log full metadataURI for debugging (truncated)
      if (metadataURI) {
        console.log('📋 MetadataURI preview:', metadataURI.substring(0, 100) + '...');
      }

      // Call contract function
      const tx = await this.contract.mintGameNFT(
        playerAddress,
        gameType,
        betAmountWei,
        payoutWei,
        multiplier,
        isWin,
        entropyTxHash,
        metadataURI
      );

      console.log('⏳ NFT mint transaction submitted:', tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();

      // Extract token ID from events
      let tokenId = null;
      if (receipt.logs && receipt.logs.length > 0) {
        try {
          // Look for GameNFTMinted event
          for (const log of receipt.logs) {
            try {
              const parsedLog = this.contract.interface.parseLog(log);
              if (parsedLog && parsedLog.name === 'GameNFTMinted') {
                tokenId = parsedLog.args.tokenId.toString();
                break;
              }
            } catch (parseError) {
              // Skip logs that can't be parsed
              continue;
            }
          }
        } catch (error) {
          console.warn('Could not parse token ID from events:', error);
        }
      }

      // If we couldn't get token ID from events, try to get current token ID - 1
      if (!tokenId) {
        try {
          const currentTokenId = await this.contract.getCurrentTokenId();
          tokenId = (Number(currentTokenId) - 1).toString();
        } catch (error) {
          console.warn('Could not get token ID from contract:', error);
          tokenId = 'unknown';
        }
      }

      console.log('✅ NFT minted successfully:', {
        txHash: receipt.hash,
        tokenId,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      });

      return {
        success: true,
        txHash: receipt.hash,
        tokenId,
        nftUrl: this.getNFTUrl(tokenId),
        explorerUrl: this.getTransactionUrl(receipt.hash)
      };

    } catch (error) {
      console.error('❌ Failed to mint NFT:', error);
      throw error;
    }
  }

  /**
   * Get NFT metadata by token ID
   * @param {string|number} tokenId - Token ID
   * @returns {Promise<Object>} NFT metadata
   */
  async getNFTMetadata(tokenId) {
    try {
      if (!this.contract) {
        throw new Error('QIE Game NFT contract not initialized');
      }

      const metadata = await this.contract.getNFTMetadata(tokenId);

      return {
        tokenId: metadata.tokenId.toString(),
        player: metadata.player,
        gameType: metadata.gameType,
        betAmount: ethers.formatEther(metadata.betAmount),
        payout: ethers.formatEther(metadata.payout),
        multiplier: metadata.multiplier,
        isWin: metadata.isWin,
        timestamp: Number(metadata.timestamp),
        entropyTxHash: metadata.entropyTxHash,
        metadataURI: metadata.metadataURI,
        nftUrl: this.getNFTUrl(tokenId),
        explorerUrl: this.getNFTUrl(tokenId)
      };

    } catch (error) {
      console.error('❌ Failed to get NFT metadata:', error);
      throw error;
    }
  }

  /**
   * Get all NFTs owned by a player
   * @param {string} playerAddress - Player's wallet address
   * @returns {Promise<Array>} Array of NFT objects
   */
  async getPlayerNFTs(playerAddress) {
    try {
      if (!this.contract) {
        throw new Error('QIE Game NFT contract not initialized');
      }

      if (!ethers.isAddress(playerAddress)) {
        throw new Error('Invalid player address');
      }

      // Get token IDs for player
      const tokenIds = await this.contract.getPlayerNFTs(playerAddress);

      if (tokenIds.length === 0) {
        return [];
      }

      // Fetch metadata for each NFT
      const nfts = await Promise.all(
        tokenIds.map(async (tokenId) => {
          try {
            return await this.getNFTMetadata(tokenId.toString());
          } catch (error) {
            console.error(`Failed to fetch NFT ${tokenId}:`, error);
            return null;
          }
        })
      );

      // Filter out failed fetches and return
      return nfts.filter(nft => nft !== null);

    } catch (error) {
      console.error('❌ Failed to get player NFTs:', error);
      throw error;
    }
  }

  /**
   * Get player's NFT count
   * @param {string} playerAddress - Player's wallet address
   * @returns {Promise<number>} Number of NFTs owned
   */
  async getPlayerNFTCount(playerAddress) {
    try {
      if (!this.contract) {
        throw new Error('QIE Game NFT contract not initialized');
      }

      if (!ethers.isAddress(playerAddress)) {
        throw new Error('Invalid player address');
      }

      const count = await this.contract.getPlayerNFTCount(playerAddress);
      return Number(count);

    } catch (error) {
      console.error('❌ Failed to get player NFT count:', error);
      throw error;
    }
  }

  /**
   * Get NFT token URI
   * @param {string|number} tokenId - Token ID
   * @returns {Promise<string>} Token URI
   */
  async getTokenURI(tokenId) {
    try {
      if (!this.contract) {
        throw new Error('QIE Game NFT contract not initialized');
      }

      const uri = await this.contract.tokenURI(tokenId);
      return uri;

    } catch (error) {
      console.error('❌ Failed to get token URI:', error);
      throw error;
    }
  }

  /**
   * Get NFT owner
   * @param {string|number} tokenId - Token ID
   * @returns {Promise<string>} Owner address
   */
  async getOwnerOf(tokenId) {
    try {
      if (!this.contract) {
        throw new Error('QIE Game NFT contract not initialized');
      }

      const owner = await this.contract.ownerOf(tokenId);
      return owner;

    } catch (error) {
      console.error('❌ Failed to get NFT owner:', error);
      throw error;
    }
  }

  /**
   * Get total supply of minted NFTs
   * @returns {Promise<number>} Total supply
   */
  async getTotalSupply() {
    try {
      if (!this.contract) {
        throw new Error('QIE Game NFT contract not initialized');
      }

      const supply = await this.contract.totalSupply();
      return Number(supply);

    } catch (error) {
      console.error('❌ Failed to get total supply:', error);
      throw error;
    }
  }

  /**
   * Listen for GameNFTMinted events
   * @param {Function} callback - Callback function for events
   * @returns {Function} Unsubscribe function
   */
  onGameNFTMinted(callback) {
    try {
      if (!this.contract) {
        throw new Error('QIE Game NFT contract not initialized');
      }

      const filter = this.contract.filters.GameNFTMinted();
      
      const listener = (tokenId, player, gameType, betAmount, payout, isWin, timestamp, event) => {
        callback({
          tokenId: tokenId.toString(),
          player,
          gameType,
          betAmount: ethers.formatEther(betAmount),
          payout: ethers.formatEther(payout),
          isWin,
          timestamp: Number(timestamp),
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          nftUrl: this.getNFTUrl(tokenId.toString())
        });
      };

      this.contract.on(filter, listener);

      // Return unsubscribe function
      return () => {
        this.contract.off(filter, listener);
      };

    } catch (error) {
      console.error('❌ Failed to set up NFT event listener:', error);
      throw error;
    }
  }

  /**
   * Get NFT explorer URL
   * @param {string|number} tokenId - Token ID
   * @returns {string} NFT explorer URL
   */
  getNFTUrl(tokenId) {
    try {
      return getQIENFTUrl(tokenId, this.contractAddress);
    } catch (error) {
      console.error('❌ Failed to generate NFT URL:', error);
      return `${this.explorerUrl}/token/${this.contractAddress}/${tokenId}`;
    }
  }

  /**
   * Get transaction explorer URL
   * @param {string} txHash - Transaction hash
   * @returns {string} Explorer URL
   */
  getTransactionUrl(txHash) {
    return `${this.explorerUrl}/tx/${txHash}`;
  }

  /**
   * Validate mint inputs
   * @param {string} playerAddress - Player address
   * @param {Object} metadata - Metadata object
   */
  validateMintInputs(playerAddress, metadata) {
    if (!playerAddress || !ethers.isAddress(playerAddress)) {
      throw new Error('Valid player address is required');
    }

    if (!metadata || typeof metadata !== 'object') {
      throw new Error('Metadata object is required');
    }

    const { gameType, betAmount, payout, multiplier, outcome } = metadata;

    if (!gameType || typeof gameType !== 'string') {
      throw new Error('Game type is required and must be a string');
    }

    if (betAmount === undefined || betAmount === null || betAmount < 0) {
      throw new Error('Valid bet amount is required');
    }

    if (payout === undefined || payout === null || payout < 0) {
      throw new Error('Valid payout amount is required');
    }

    if (!multiplier || typeof multiplier !== 'string') {
      throw new Error('Multiplier is required and must be a string');
    }

    if (outcome === undefined || outcome === null) {
      throw new Error('Outcome is required');
    }
  }

  /**
   * Check if address is authorized minter
   * @param {string} address - Address to check
   * @returns {Promise<boolean>} True if authorized
   */
  async isAuthorizedMinter(address) {
    try {
      if (!this.contract) {
        throw new Error('QIE Game NFT contract not initialized');
      }

      return await this.contract.isAuthorizedMinter(address);
    } catch (error) {
      console.error('❌ Failed to check minter authorization:', error);
      return false;
    }
  }
}

// Export singleton instance (will be initialized when provider is available)
export const qieGameNFT = new QIEGameNFT();
export default QIEGameNFT;