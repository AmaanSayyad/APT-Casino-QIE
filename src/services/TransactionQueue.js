import { ethers } from 'ethers';

// Use dynamic import for uuid to avoid Jest issues
let uuidv4;
if (typeof window === 'undefined') {
  // Node.js environment
  try {
    const { v4 } = require('uuid');
    uuidv4 = v4;
  } catch (error) {
    // Fallback to simple ID generation
    uuidv4 = () => Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
} else {
  // Browser environment - use simple ID generation
  uuidv4 = () => Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Transaction Queue Service
 * Handles sequential processing of blockchain transactions to prevent nonce conflicts
 * Implements retry logic with exponential backoff
 */
export class TransactionQueue {
  constructor(provider = null, signer = null) {
    this.provider = provider;
    this.signer = signer;
    this.queue = [];
    this.processing = false;
    this.currentNonce = null;
    this.maxRetries = 3;
    this.baseDelay = 1000; // 1 second base delay
    this.maxDelay = 30000; // 30 seconds max delay
    
    console.log('🔄 TransactionQueue initialized');
  }

  /**
   * Set provider and signer for transaction processing
   * @param {ethers.Provider} provider - Ethers provider
   * @param {ethers.Signer} signer - Ethers signer
   */
  setProviderAndSigner(provider, signer) {
    this.provider = provider;
    this.signer = signer;
    console.log('✅ TransactionQueue provider and signer updated');
  }

  /**
   * Add a transaction to the queue
   * @param {Object} transaction - Transaction to queue
   * @param {string} transaction.type - Transaction type ('LOG' | 'NFT')
   * @param {Object} transaction.data - Transaction data
   * @returns {Promise<string>} Transaction ID
   */
  async enqueue(transaction) {
    try {
      // Validate transaction
      this.validateTransaction(transaction);

      const queuedTransaction = {
        id: uuidv4(),
        type: transaction.type,
        data: transaction.data,
        status: 'PENDING',
        retryCount: 0,
        createdAt: new Date(),
        lastAttempt: null,
        error: null,
        result: null
      };

      this.queue.push(queuedTransaction);

      console.log(`📥 Transaction queued: ${queuedTransaction.id} (${queuedTransaction.type})`);
      console.log(`📊 Queue size: ${this.queue.length}`);

      // Start processing if not already running
      if (!this.processing) {
        this.process().catch(error => {
          console.error('❌ Queue processing error:', error);
        });
      }

      return queuedTransaction.id;

    } catch (error) {
      console.error('❌ Failed to enqueue transaction:', error);
      throw error;
    }
  }

  /**
   * Process the transaction queue sequentially
   * @returns {Promise<void>}
   */
  async process() {
    if (this.processing) {
      console.log('⏳ Queue processing already in progress');
      return;
    }

    if (this.queue.length === 0) {
      console.log('📭 Queue is empty');
      return;
    }

    if (!this.signer) {
      console.warn('⚠️ No signer available, skipping queue processing');
      return;
    }

    this.processing = true;
    console.log('🚀 Starting queue processing...');

    try {
      // Initialize nonce if not set
      if (this.currentNonce === null) {
        await this.initializeNonce();
      }

      while (this.queue.length > 0) {
        const transaction = this.queue[0]; // Get first transaction (FIFO)

        if (transaction.status === 'PENDING' || transaction.status === 'FAILED') {
          await this.processTransaction(transaction);
        }

        // Remove completed or permanently failed transactions
        if (transaction.status === 'COMPLETED' || 
            (transaction.status === 'FAILED' && transaction.retryCount >= this.maxRetries)) {
          this.queue.shift();
          console.log(`🗑️ Removed transaction from queue: ${transaction.id} (${transaction.status})`);
        } else if (transaction.status === 'FAILED') {
          // Keep failed transaction for retry, but move to next
          break;
        }
      }

    } catch (error) {
      console.error('❌ Queue processing failed:', error);
    } finally {
      this.processing = false;
      console.log('⏹️ Queue processing stopped');

      // If there are still pending transactions, schedule next processing
      if (this.queue.length > 0) {
        const nextPendingTransaction = this.queue.find(tx => 
          tx.status === 'PENDING' || 
          (tx.status === 'FAILED' && tx.retryCount < this.maxRetries)
        );

        if (nextPendingTransaction) {
          const delay = this.calculateRetryDelay(nextPendingTransaction.retryCount);
          console.log(`⏰ Scheduling next processing in ${delay}ms`);
          
          setTimeout(() => {
            this.process().catch(error => {
              console.error('❌ Scheduled queue processing error:', error);
            });
          }, delay);
        }
      }
    }
  }

  /**
   * Process a single transaction
   * @param {Object} transaction - Transaction to process
   * @returns {Promise<void>}
   */
  async processTransaction(transaction) {
    try {
      console.log(`🔄 Processing transaction: ${transaction.id} (${transaction.type})`);
      
      transaction.status = 'PROCESSING';
      transaction.lastAttempt = new Date();

      let result;

      switch (transaction.type) {
        case 'LOG':
          result = await this.processLogTransaction(transaction.data);
          break;
        case 'NFT':
          result = await this.processNFTTransaction(transaction.data);
          break;
        default:
          throw new Error(`Unknown transaction type: ${transaction.type}`);
      }

      transaction.status = 'COMPLETED';
      transaction.result = result;
      transaction.error = null;

      console.log(`✅ Transaction completed: ${transaction.id}`);

    } catch (error) {
      console.error(`❌ Transaction failed: ${transaction.id}`, error);
      
      transaction.status = 'FAILED';
      transaction.error = error.message;
      transaction.retryCount++;

      if (transaction.retryCount < this.maxRetries) {
        console.log(`🔄 Will retry transaction ${transaction.id} (attempt ${transaction.retryCount + 1}/${this.maxRetries})`);
      } else {
        console.error(`💀 Transaction permanently failed: ${transaction.id}`);
      }
    }
  }

  /**
   * Process a game log transaction
   * @param {Object} data - Log transaction data
   * @returns {Promise<Object>} Transaction result
   */
  async processLogTransaction(data) {
    // Import QIEGameLogger dynamically to avoid circular dependencies
    const { QIEGameLogger } = await import('./QIEGameLogger.js');
    
    const logger = new QIEGameLogger(this.provider, this.signer);
    return await logger.logGameResult(data);
  }

  /**
   * Process an NFT mint transaction
   * @param {Object} data - NFT transaction data
   * @returns {Promise<Object>} Transaction result
   */
  async processNFTTransaction(data) {
    // Import QIEGameNFT dynamically to avoid circular dependencies
    const { QIEGameNFT } = await import('./QIEGameNFT.js');
    
    const nftService = new QIEGameNFT(this.provider, this.signer);
    return await nftService.mintGameNFT(data.playerAddress, data.metadata);
  }

  /**
   * Get transaction status by ID
   * @param {string} id - Transaction ID
   * @returns {Promise<Object|null>} Transaction status or null if not found
   */
  async getStatus(id) {
    const transaction = this.queue.find(tx => tx.id === id);
    
    if (!transaction) {
      return null;
    }

    return {
      id: transaction.id,
      type: transaction.type,
      status: transaction.status,
      retryCount: transaction.retryCount,
      createdAt: transaction.createdAt,
      lastAttempt: transaction.lastAttempt,
      error: transaction.error,
      result: transaction.result
    };
  }

  /**
   * Get all transactions in queue
   * @returns {Array} Array of queued transactions
   */
  getQueue() {
    return this.queue.map(tx => ({
      id: tx.id,
      type: tx.type,
      status: tx.status,
      retryCount: tx.retryCount,
      createdAt: tx.createdAt,
      lastAttempt: tx.lastAttempt
    }));
  }

  /**
   * Clear completed transactions from queue
   * @returns {number} Number of transactions cleared
   */
  clearCompleted() {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter(tx => tx.status !== 'COMPLETED');
    const cleared = initialLength - this.queue.length;
    
    if (cleared > 0) {
      console.log(`🧹 Cleared ${cleared} completed transactions`);
    }
    
    return cleared;
  }

  /**
   * Clear all transactions from queue
   * @returns {number} Number of transactions cleared
   */
  clearAll() {
    const cleared = this.queue.length;
    this.queue = [];
    this.processing = false;
    
    if (cleared > 0) {
      console.log(`🧹 Cleared all ${cleared} transactions`);
    }
    
    return cleared;
  }

  /**
   * Initialize nonce from blockchain
   * @returns {Promise<void>}
   */
  async initializeNonce() {
    try {
      if (!this.signer) {
        throw new Error('Signer required to initialize nonce');
      }

      this.currentNonce = await this.signer.getNonce();
      console.log(`🔢 Initialized nonce: ${this.currentNonce}`);

    } catch (error) {
      console.error('❌ Failed to initialize nonce:', error);
      throw error;
    }
  }

  /**
   * Get next nonce and increment counter
   * @returns {number} Next nonce value
   */
  getNextNonce() {
    if (this.currentNonce === null) {
      throw new Error('Nonce not initialized');
    }

    const nonce = this.currentNonce;
    this.currentNonce++;
    
    console.log(`🔢 Using nonce: ${nonce}, next: ${this.currentNonce}`);
    return nonce;
  }

  /**
   * Calculate retry delay with exponential backoff
   * @param {number} retryCount - Current retry count
   * @returns {number} Delay in milliseconds
   */
  calculateRetryDelay(retryCount) {
    const delay = Math.min(
      this.baseDelay * Math.pow(2, retryCount),
      this.maxDelay
    );
    
    // Add some jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  /**
   * Validate transaction before queuing
   * @param {Object} transaction - Transaction to validate
   */
  validateTransaction(transaction) {
    if (!transaction) {
      throw new Error('Transaction is required');
    }

    if (!transaction.type) {
      throw new Error('Transaction type is required');
    }

    if (!['LOG', 'NFT'].includes(transaction.type)) {
      throw new Error(`Invalid transaction type: ${transaction.type}`);
    }

    if (!transaction.data) {
      throw new Error('Transaction data is required');
    }

    // Type-specific validation
    switch (transaction.type) {
      case 'LOG':
        this.validateLogTransaction(transaction.data);
        break;
      case 'NFT':
        this.validateNFTTransaction(transaction.data);
        break;
    }
  }

  /**
   * Validate log transaction data
   * @param {Object} data - Log transaction data
   */
  validateLogTransaction(data) {
    const required = ['gameType', 'playerAddress', 'betAmount', 'payout', 'result'];
    
    for (const field of required) {
      if (data[field] === undefined || data[field] === null) {
        throw new Error(`Log transaction missing required field: ${field}`);
      }
    }

    if (!ethers.isAddress(data.playerAddress)) {
      throw new Error('Invalid player address in log transaction');
    }

    if (typeof data.betAmount !== 'number' || data.betAmount < 0) {
      throw new Error('Invalid bet amount in log transaction');
    }

    if (typeof data.payout !== 'number' || data.payout < 0) {
      throw new Error('Invalid payout amount in log transaction');
    }
  }

  /**
   * Validate NFT transaction data
   * @param {Object} data - NFT transaction data
   */
  validateNFTTransaction(data) {
    if (!data.playerAddress || !ethers.isAddress(data.playerAddress)) {
      throw new Error('Invalid player address in NFT transaction');
    }

    if (!data.metadata || typeof data.metadata !== 'object') {
      throw new Error('Invalid metadata in NFT transaction');
    }

    const requiredMetadata = ['name', 'description', 'attributes'];
    for (const field of requiredMetadata) {
      if (!data.metadata[field]) {
        throw new Error(`NFT metadata missing required field: ${field}`);
      }
    }
  }

  /**
   * Get queue statistics
   * @returns {Object} Queue statistics
   */
  getStats() {
    const stats = {
      total: this.queue.length,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      processing: this.processing
    };

    for (const tx of this.queue) {
      stats[tx.status.toLowerCase()]++;
    }

    return stats;
  }
}

// Export singleton instance
export const transactionQueue = new TransactionQueue();
export default TransactionQueue;