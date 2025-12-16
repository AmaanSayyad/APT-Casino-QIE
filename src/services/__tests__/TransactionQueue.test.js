/**
 * Tests for Transaction Queue Service
 * 
 * Note: These are basic unit tests. Integration tests require actual
 * blockchain connection and should be run manually.
 */

import { TransactionQueue } from '../TransactionQueue';
import { ethers } from 'ethers';

describe('TransactionQueue', () => {
  let queue;

  beforeEach(() => {
    queue = new TransactionQueue();
  });

  describe('Initialization', () => {
    it('should create instance without provider', () => {
      expect(queue).toBeInstanceOf(TransactionQueue);
      expect(queue.provider).toBeNull();
      expect(queue.signer).toBeNull();
      expect(queue.queue).toEqual([]);
      expect(queue.processing).toBe(false);
      expect(queue.currentNonce).toBeNull();
    });

    it('should have correct default configuration', () => {
      expect(queue.maxRetries).toBe(3);
      expect(queue.baseDelay).toBe(1000);
      expect(queue.maxDelay).toBe(30000);
    });
  });

  describe('Provider and Signer Management', () => {
    it('should set provider and signer', () => {
      const mockProvider = {};
      const mockSigner = {};
      
      queue.setProviderAndSigner(mockProvider, mockSigner);
      
      expect(queue.provider).toBe(mockProvider);
      expect(queue.signer).toBe(mockSigner);
    });
  });

  describe('Transaction Validation', () => {
    it('should validate transaction type', () => {
      const invalidTransaction = {
        type: 'INVALID',
        data: {}
      };

      expect(() => queue.validateTransaction(invalidTransaction)).toThrow('Invalid transaction type: INVALID');
    });

    it('should require transaction type', () => {
      const invalidTransaction = {
        data: {}
      };

      expect(() => queue.validateTransaction(invalidTransaction)).toThrow('Transaction type is required');
    });

    it('should require transaction data', () => {
      const invalidTransaction = {
        type: 'LOG'
      };

      expect(() => queue.validateTransaction(invalidTransaction)).toThrow('Transaction data is required');
    });

    it('should validate LOG transaction data', () => {
      const invalidLogTransaction = {
        type: 'LOG',
        data: {
          gameType: 'ROULETTE',
          // missing playerAddress
          betAmount: 0.1,
          payout: 0.5,
          result: {}
        }
      };

      expect(() => queue.validateTransaction(invalidLogTransaction)).toThrow('Log transaction missing required field: playerAddress');
    });

    it('should validate LOG transaction player address', () => {
      const invalidLogTransaction = {
        type: 'LOG',
        data: {
          gameType: 'ROULETTE',
          playerAddress: 'invalid-address',
          betAmount: 0.1,
          payout: 0.5,
          result: {}
        }
      };

      expect(() => queue.validateTransaction(invalidLogTransaction)).toThrow('Invalid player address in log transaction');
    });

    it('should validate LOG transaction bet amount', () => {
      const invalidLogTransaction = {
        type: 'LOG',
        data: {
          gameType: 'ROULETTE',
          playerAddress: '0x1234567890123456789012345678901234567890',
          betAmount: -1,
          payout: 0.5,
          result: {}
        }
      };

      expect(() => queue.validateTransaction(invalidLogTransaction)).toThrow('Invalid bet amount in log transaction');
    });

    it('should validate NFT transaction data', () => {
      const invalidNFTTransaction = {
        type: 'NFT',
        data: {
          playerAddress: 'invalid-address',
          metadata: {}
        }
      };

      expect(() => queue.validateTransaction(invalidNFTTransaction)).toThrow('Invalid player address in NFT transaction');
    });

    it('should validate NFT metadata', () => {
      const invalidNFTTransaction = {
        type: 'NFT',
        data: {
          playerAddress: '0x1234567890123456789012345678901234567890',
          metadata: {
            name: 'Test NFT'
            // missing description and attributes
          }
        }
      };

      expect(() => queue.validateTransaction(invalidNFTTransaction)).toThrow('NFT metadata missing required field: description');
    });

    it('should pass validation with valid LOG transaction', () => {
      const validLogTransaction = {
        type: 'LOG',
        data: {
          gameType: 'ROULETTE',
          playerAddress: '0x1234567890123456789012345678901234567890',
          betAmount: 0.1,
          payout: 0.5,
          result: { winningNumber: 17 }
        }
      };

      expect(() => queue.validateTransaction(validLogTransaction)).not.toThrow();
    });

    it('should pass validation with valid NFT transaction', () => {
      const validNFTTransaction = {
        type: 'NFT',
        data: {
          playerAddress: '0x1234567890123456789012345678901234567890',
          metadata: {
            name: 'Test NFT',
            description: 'Test Description',
            attributes: []
          }
        }
      };

      expect(() => queue.validateTransaction(validNFTTransaction)).not.toThrow();
    });
  });

  describe('Queue Management', () => {
    it('should enqueue valid transaction', async () => {
      const transaction = {
        type: 'LOG',
        data: {
          gameType: 'ROULETTE',
          playerAddress: '0x1234567890123456789012345678901234567890',
          betAmount: 0.1,
          payout: 0.5,
          result: { winningNumber: 17 }
        }
      };

      const id = await queue.enqueue(transaction);
      
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(queue.queue.length).toBe(1);
      expect(queue.queue[0].id).toBe(id);
      expect(queue.queue[0].type).toBe('LOG');
      expect(queue.queue[0].status).toBe('PENDING');
    });

    it('should get transaction status by ID', async () => {
      const transaction = {
        type: 'LOG',
        data: {
          gameType: 'ROULETTE',
          playerAddress: '0x1234567890123456789012345678901234567890',
          betAmount: 0.1,
          payout: 0.5,
          result: { winningNumber: 17 }
        }
      };

      const id = await queue.enqueue(transaction);
      const status = await queue.getStatus(id);
      
      expect(status).toBeDefined();
      expect(status.id).toBe(id);
      expect(status.type).toBe('LOG');
      expect(status.status).toBe('PENDING');
      expect(status.retryCount).toBe(0);
    });

    it('should return null for non-existent transaction ID', async () => {
      const status = await queue.getStatus('non-existent-id');
      expect(status).toBeNull();
    });

    it('should get queue contents', () => {
      expect(queue.getQueue()).toEqual([]);
    });

    it('should clear completed transactions', () => {
      // Add a mock completed transaction
      queue.queue.push({
        id: 'test-id',
        type: 'LOG',
        status: 'COMPLETED',
        retryCount: 0,
        createdAt: new Date(),
        lastAttempt: null
      });

      const cleared = queue.clearCompleted();
      
      expect(cleared).toBe(1);
      expect(queue.queue.length).toBe(0);
    });

    it('should clear all transactions', () => {
      // Add mock transactions
      queue.queue.push(
        {
          id: 'test-id-1',
          type: 'LOG',
          status: 'PENDING',
          retryCount: 0,
          createdAt: new Date(),
          lastAttempt: null
        },
        {
          id: 'test-id-2',
          type: 'NFT',
          status: 'COMPLETED',
          retryCount: 0,
          createdAt: new Date(),
          lastAttempt: null
        }
      );

      const cleared = queue.clearAll();
      
      expect(cleared).toBe(2);
      expect(queue.queue.length).toBe(0);
      expect(queue.processing).toBe(false);
    });
  });

  describe('Retry Logic', () => {
    it('should calculate retry delay with exponential backoff', () => {
      const delay0 = queue.calculateRetryDelay(0);
      const delay1 = queue.calculateRetryDelay(1);
      const delay2 = queue.calculateRetryDelay(2);
      
      expect(delay0).toBeGreaterThanOrEqual(1000); // base delay
      expect(delay1).toBeGreaterThanOrEqual(2000); // 2x base delay
      expect(delay2).toBeGreaterThanOrEqual(4000); // 4x base delay
      
      // Should not exceed max delay
      const delayMax = queue.calculateRetryDelay(10);
      expect(delayMax).toBeLessThanOrEqual(queue.maxDelay * 1.1); // Allow for jitter
    });

    it('should add jitter to retry delay', () => {
      const delays = [];
      for (let i = 0; i < 10; i++) {
        delays.push(queue.calculateRetryDelay(1));
      }
      
      // Check that delays are not all identical (jitter is working)
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });
  });

  describe('Queue Statistics', () => {
    it('should return correct statistics for empty queue', () => {
      const stats = queue.getStats();
      
      expect(stats).toEqual({
        total: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        processing: false
      });
    });

    it('should return correct statistics with transactions', () => {
      // Add mock transactions with different statuses
      queue.queue.push(
        {
          id: 'test-1',
          type: 'LOG',
          status: 'PENDING',
          retryCount: 0,
          createdAt: new Date(),
          lastAttempt: null
        },
        {
          id: 'test-2',
          type: 'NFT',
          status: 'COMPLETED',
          retryCount: 0,
          createdAt: new Date(),
          lastAttempt: null
        },
        {
          id: 'test-3',
          type: 'LOG',
          status: 'FAILED',
          retryCount: 2,
          createdAt: new Date(),
          lastAttempt: new Date()
        }
      );

      const stats = queue.getStats();
      
      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.processing).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle process() without signer gracefully', async () => {
      const transaction = {
        type: 'LOG',
        data: {
          gameType: 'ROULETTE',
          playerAddress: '0x1234567890123456789012345678901234567890',
          betAmount: 0.1,
          payout: 0.5,
          result: { winningNumber: 17 }
        }
      };

      await queue.enqueue(transaction);
      
      // Should not throw error when processing without signer
      await expect(queue.process()).resolves.not.toThrow();
    });

    it('should handle empty queue processing', async () => {
      await expect(queue.process()).resolves.not.toThrow();
    });
  });
});