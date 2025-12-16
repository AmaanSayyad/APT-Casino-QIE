/**
 * Unit tests for Explorer URL utility functions
 */

import {
  getQIEExplorerUrl,
  getQIENFTUrl,
  getEntropyExplorerUrl,
  getQIEExplorerBaseUrl,
  getEntropyExplorerBaseUrl,
  isValidTxHash,
  isValidAddress
} from '../explorerUrls';

describe('Explorer URL Utilities', () => {
  describe('getQIEExplorerUrl', () => {
    it('should generate correct QIE explorer URL for valid transaction hash', () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const expectedUrl = 'https://testnet.qie.digital/tx/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      expect(getQIEExplorerUrl(txHash)).toBe(expectedUrl);
    });

    it('should handle transaction hash without 0x prefix', () => {
      const txHash = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const expectedUrl = 'https://testnet.qie.digital/tx/1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      expect(getQIEExplorerUrl(txHash)).toBe(expectedUrl);
    });

    it('should throw error for empty transaction hash', () => {
      expect(() => getQIEExplorerUrl('')).toThrow('Transaction hash is required and must be a string');
    });

    it('should throw error for null transaction hash', () => {
      expect(() => getQIEExplorerUrl(null)).toThrow('Transaction hash is required and must be a string');
    });

    it('should throw error for invalid transaction hash format', () => {
      expect(() => getQIEExplorerUrl('invalid-hash')).toThrow('Invalid transaction hash format');
    });

    it('should throw error for short transaction hash', () => {
      expect(() => getQIEExplorerUrl('0x1234')).toThrow('Invalid transaction hash format');
    });
  });

  describe('getQIENFTUrl', () => {
    const validContractAddress = '0x1234567890123456789012345678901234567890';

    beforeEach(() => {
      // Clear environment variable
      delete process.env.NEXT_PUBLIC_QIE_GAME_NFT_ADDRESS;
    });

    it('should generate correct NFT URL with provided contract address', () => {
      const tokenId = '123';
      const expectedUrl = `https://testnet.qie.digital/token/${validContractAddress}/123`;
      
      expect(getQIENFTUrl(tokenId, validContractAddress)).toBe(expectedUrl);
    });

    it('should generate correct NFT URL with numeric token ID', () => {
      const tokenId = 456;
      const expectedUrl = `https://testnet.qie.digital/token/${validContractAddress}/456`;
      
      expect(getQIENFTUrl(tokenId, validContractAddress)).toBe(expectedUrl);
    });

    it('should use environment variable when contract address not provided', () => {
      process.env.NEXT_PUBLIC_QIE_GAME_NFT_ADDRESS = validContractAddress;
      const tokenId = '789';
      const expectedUrl = `https://testnet.qie.digital/token/${validContractAddress}/789`;
      
      expect(getQIENFTUrl(tokenId)).toBe(expectedUrl);
    });

    it('should throw error when token ID is empty', () => {
      expect(() => getQIENFTUrl('', validContractAddress)).toThrow('Token ID is required and must be a string or number');
    });

    it('should throw error when token ID is null', () => {
      expect(() => getQIENFTUrl(null, validContractAddress)).toThrow('Token ID is required and must be a string or number');
    });

    it('should throw error when contract address is not provided and env var is missing', () => {
      expect(() => getQIENFTUrl('123')).toThrow('NFT contract address is required');
    });

    it('should throw error for invalid contract address format', () => {
      expect(() => getQIENFTUrl('123', 'invalid-address')).toThrow('Invalid contract address format');
    });
  });

  describe('getEntropyExplorerUrl', () => {
    it('should generate correct Entropy explorer URL for valid transaction hash', () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const expectedUrl = 'https://entropy-explorer.pyth.network/?chain=arbitrum-sepolia&search=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      expect(getEntropyExplorerUrl(txHash)).toBe(expectedUrl);
    });

    it('should handle transaction hash without 0x prefix', () => {
      const txHash = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const expectedUrl = 'https://entropy-explorer.pyth.network/?chain=arbitrum-sepolia&search=1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      expect(getEntropyExplorerUrl(txHash)).toBe(expectedUrl);
    });

    it('should throw error for empty transaction hash', () => {
      expect(() => getEntropyExplorerUrl('')).toThrow('Transaction hash is required and must be a string');
    });

    it('should throw error for null transaction hash', () => {
      expect(() => getEntropyExplorerUrl(null)).toThrow('Transaction hash is required and must be a string');
    });

    it('should throw error for invalid transaction hash format', () => {
      expect(() => getEntropyExplorerUrl('invalid-hash')).toThrow('Invalid transaction hash format');
    });
  });

  describe('Base URL getters', () => {
    it('should return correct QIE explorer base URL', () => {
      expect(getQIEExplorerBaseUrl()).toBe('https://testnet.qie.digital');
    });

    it('should return correct Entropy explorer base URL', () => {
      expect(getEntropyExplorerBaseUrl()).toBe('https://entropy-explorer.pyth.network');
    });
  });

  describe('Validation helpers', () => {
    describe('isValidTxHash', () => {
      it('should return true for valid transaction hash with 0x prefix', () => {
        const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
        expect(isValidTxHash(txHash)).toBe(true);
      });

      it('should return true for valid transaction hash without 0x prefix', () => {
        const txHash = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
        expect(isValidTxHash(txHash)).toBe(true);
      });

      it('should return false for invalid transaction hash', () => {
        expect(isValidTxHash('invalid-hash')).toBe(false);
        expect(isValidTxHash('0x1234')).toBe(false);
        expect(isValidTxHash('')).toBe(false);
        expect(isValidTxHash(null)).toBe(false);
      });
    });

    describe('isValidAddress', () => {
      it('should return true for valid Ethereum address', () => {
        const address = '0x1234567890123456789012345678901234567890';
        expect(isValidAddress(address)).toBe(true);
      });

      it('should return false for invalid address', () => {
        expect(isValidAddress('invalid-address')).toBe(false);
        expect(isValidAddress('0x1234')).toBe(false);
        expect(isValidAddress('')).toBe(false);
        expect(isValidAddress(null)).toBe(false);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle uppercase transaction hashes', () => {
      const txHash = '0x1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF';
      expect(() => getQIEExplorerUrl(txHash)).not.toThrow();
      expect(() => getEntropyExplorerUrl(txHash)).not.toThrow();
    });

    it('should handle mixed case transaction hashes', () => {
      const txHash = '0x1234567890AbCdEf1234567890AbCdEf1234567890AbCdEf1234567890AbCdEf';
      expect(() => getQIEExplorerUrl(txHash)).not.toThrow();
      expect(() => getEntropyExplorerUrl(txHash)).not.toThrow();
    });

    it('should handle large token IDs', () => {
      const tokenId = '999999999999999999999999999999';
      const contractAddress = '0x1234567890123456789012345678901234567890';
      expect(() => getQIENFTUrl(tokenId, contractAddress)).not.toThrow();
    });
  });
});