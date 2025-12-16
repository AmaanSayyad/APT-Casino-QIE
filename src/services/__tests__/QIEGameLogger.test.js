/**
 * Tests for QIE Game Logger Service
 * 
 * Note: These are basic unit tests. Integration tests require actual
 * blockchain connection and should be run manually.
 */

import { QIEGameLogger } from '../QIEGameLogger';
import { ethers } from 'ethers';

describe('QIEGameLogger', () => {
  let logger;

  beforeEach(() => {
    logger = new QIEGameLogger();
  });

  describe('Initialization', () => {
    it('should create instance without provider', () => {
      expect(logger).toBeInstanceOf(QIEGameLogger);
      expect(logger.contract).toBeNull();
    });

    it('should have correct contract address', () => {
      expect(logger.contractAddress).toBeDefined();
      // In test environment, contract address might be empty string
      if (logger.contractAddress) {
        expect(logger.contractAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
      }
    });

    it('should have correct explorer URL', () => {
      expect(logger.explorerUrl).toBeDefined();
      expect(logger.explorerUrl).toContain('qie.digital');
    });

    it('should have correct network configuration', () => {
      expect(logger.network).toBe('qie-testnet');
    });
  });

  describe('Game Type Mapping', () => {
    it('should map game type names to enum values', () => {
      expect(logger.getGameTypeName(0)).toBe('ROULETTE');
      expect(logger.getGameTypeName(1)).toBe('MINES');
      expect(logger.getGameTypeName(2)).toBe('WHEEL');
      expect(logger.getGameTypeName(3)).toBe('PLINKO');
    });

    it('should return UNKNOWN for invalid enum', () => {
      expect(logger.getGameTypeName(99)).toBe('UNKNOWN');
    });
  });

  describe('Data Validation', () => {
    it('should validate required game data fields', () => {
      const invalidData = {
        gameType: 'ROULETTE',
        // missing playerAddress
        betAmount: '0.1',
        result: {},
        payout: '0.5'
      };

      expect(() => logger.validateGameData(invalidData)).toThrow('Valid player address is required');
    });

    it('should validate Ethereum address format', () => {
      const invalidData = {
        gameType: 'ROULETTE',
        playerAddress: 'invalid-address',
        betAmount: '0.1',
        result: {},
        payout: '0.5'
      };

      expect(() => logger.validateGameData(invalidData)).toThrow('Valid player address is required');
    });

    it('should validate bet amount', () => {
      const invalidData = {
        gameType: 'ROULETTE',
        playerAddress: '0x1234567890123456789012345678901234567890',
        betAmount: -1,
        result: {},
        payout: '0.5'
      };

      expect(() => logger.validateGameData(invalidData)).toThrow('Valid bet amount is required');
    });

    it('should validate payout amount', () => {
      const invalidData = {
        gameType: 'ROULETTE',
        playerAddress: '0x1234567890123456789012345678901234567890',
        betAmount: '0.1',
        result: {},
        payout: -1
      };

      expect(() => logger.validateGameData(invalidData)).toThrow('Valid payout amount is required');
    });

    it('should validate result data', () => {
      const invalidData = {
        gameType: 'ROULETTE',
        playerAddress: '0x1234567890123456789012345678901234567890',
        betAmount: '0.1',
        result: null,
        payout: '0.5'
      };

      expect(() => logger.validateGameData(invalidData)).toThrow('Game result is required');
    });

    it('should pass validation with valid data', () => {
      const validData = {
        gameType: 'ROULETTE',
        playerAddress: '0x1234567890123456789012345678901234567890',
        betAmount: '0.1',
        result: { winningNumber: 17 },
        payout: '0.5'
      };

      expect(() => logger.validateGameData(validData)).not.toThrow();
    });
  });

  describe('Result Data Encoding/Decoding', () => {
    it('should encode result data to bytes', () => {
      const result = { winningNumber: 17, bets: [] };
      const encoded = logger.encodeResultData(result);
      
      expect(encoded).toBeDefined();
      expect(typeof encoded).toBe('object'); // Uint8Array
    });

    it('should decode result data from bytes', () => {
      const result = { winningNumber: 17, bets: [] };
      const encoded = logger.encodeResultData(result);
      const decoded = logger.decodeResultData(encoded);
      
      expect(decoded).toEqual(result);
    });

    it('should handle empty result data', () => {
      const decoded = logger.decodeResultData('0x');
      expect(decoded).toBeNull();
    });

    it('should handle invalid result data gracefully', () => {
      const decoded = logger.decodeResultData('invalid');
      expect(decoded).toBeNull();
    });
  });

  describe('Transaction URL Generation', () => {
    it('should generate correct QIE explorer URL', () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const url = logger.getTransactionUrl(txHash);
      
      expect(url).toContain('testnet.qie.digital');
      expect(url).toContain(txHash);
      expect(url).toMatch(/^https?:\/\//);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when logging without contract', async () => {
      const gameData = {
        gameType: 'ROULETTE',
        playerAddress: '0x1234567890123456789012345678901234567890',
        betAmount: '0.1',
        result: { winningNumber: 17 },
        payout: '0.5'
      };

      await expect(logger.logGameResult(gameData)).rejects.toThrow('QIE Game Logger contract not initialized');
    });

    it('should throw error when getting log without contract', async () => {
      const logId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      await expect(logger.getGameLog(logId)).rejects.toThrow('QIE Game Logger contract not initialized');
    });

    it('should throw error when getting history without contract', async () => {
      await expect(logger.getPlayerHistory('0x1234567890123456789012345678901234567890')).rejects.toThrow('QIE Game Logger contract not initialized');
    });

    it('should throw error when getting stats without contract', async () => {
      await expect(logger.getStats()).rejects.toThrow('QIE Game Logger contract not initialized');
    });

    it('should throw error when getting player count without contract', async () => {
      await expect(logger.getPlayerGameCount('0x1234567890123456789012345678901234567890')).rejects.toThrow('QIE Game Logger contract not initialized');
    });
  });

  describe('Server Wallet Initialization', () => {
    it('should not initialize server wallet in browser environment', () => {
      // In browser environment (window is defined), server wallet should not be initialized
      expect(logger.signer).toBeNull();
    });
  });

  describe('Provider and Signer Management', () => {
    it('should set provider and signer', () => {
      const mockProvider = {};
      const mockSigner = {};
      
      // Mock the contract address to avoid initialization error
      logger.contractAddress = '0x1234567890123456789012345678901234567890';
      
      logger.setProviderAndSigner(mockProvider, mockSigner);
      
      expect(logger.provider).toBe(mockProvider);
      expect(logger.signer).toBe(mockSigner);
    });
  });

  describe('Game Type Validation', () => {
    it('should throw error for invalid game type', async () => {
      const gameData = {
        gameType: 'INVALID_GAME',
        playerAddress: '0x1234567890123456789012345678901234567890',
        betAmount: '0.1',
        result: { winningNumber: 17 },
        payout: '0.5'
      };

      // Mock the contract to test game type validation
      logger.contract = {};
      logger.signer = {};

      await expect(logger.logGameResult(gameData)).rejects.toThrow('Invalid game type: INVALID_GAME');
    });
  });
});