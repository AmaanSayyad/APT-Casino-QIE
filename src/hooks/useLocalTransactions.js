import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'qie_pending_transactions';
const TRANSACTION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Hook to manage pending transactions in localStorage
 * Stores transaction IDs and polls their status
 */
export function useLocalTransactions() {
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [completedTransactions, setCompletedTransactions] = useState([]);

  // Load transactions from localStorage on mount
  useEffect(() => {
    loadTransactionsFromStorage();
  }, []);

  // Save transactions to localStorage whenever they change
  useEffect(() => {
    saveTransactionsToStorage();
  }, [pendingTransactions, completedTransactions]);

  /**
   * Load transactions from localStorage
   */
  const loadTransactionsFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const now = Date.now();
        
        // Filter out expired transactions
        const validPending = (data.pending || []).filter(tx => 
          now - new Date(tx.createdAt).getTime() < TRANSACTION_EXPIRY
        );
        
        const validCompleted = (data.completed || []).filter(tx => 
          now - new Date(tx.completedAt).getTime() < TRANSACTION_EXPIRY
        );

        setPendingTransactions(validPending);
        setCompletedTransactions(validCompleted);
      }
    } catch (error) {
      console.error('❌ Failed to load transactions from localStorage:', error);
    }
  }, []);

  /**
   * Save transactions to localStorage
   */
  const saveTransactionsToStorage = useCallback(() => {
    try {
      const data = {
        pending: pendingTransactions,
        completed: completedTransactions,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('❌ Failed to save transactions to localStorage:', error);
    }
  }, [pendingTransactions, completedTransactions]);

  /**
   * Add a new pending transaction
   * @param {Object} transaction - Transaction data
   */
  const addPendingTransaction = useCallback((transaction) => {
    console.log('📥 addPendingTransaction called with:', transaction);
    
    const newTransaction = {
      ...transaction,
      createdAt: new Date().toISOString(),
      status: 'PENDING'
    };

    console.log('📥 Creating new transaction:', newTransaction);

    setPendingTransactions(prev => {
      console.log('📥 Current pending transactions:', prev);
      
      // Avoid duplicates
      const exists = prev.some(tx => tx.logId === transaction.logId || tx.nftId === transaction.nftId);
      if (exists) {
        console.log('📥 Transaction already exists, skipping');
        return prev;
      }
      
      const updated = [...prev, newTransaction];
      console.log('📥 Updated pending transactions:', updated);
      return updated;
    });

    console.log('📥 Added pending transaction to localStorage:', newTransaction);
  }, []);

  /**
   * Mark transaction as completed and move to completed list
   * @param {string} transactionId - Transaction ID (logId or nftId)
   * @param {Object} result - Transaction result
   */
  const markTransactionCompleted = useCallback((transactionId, result) => {
    setPendingTransactions(prev => {
      const transaction = prev.find(tx => tx.logId === transactionId || tx.nftId === transactionId);
      if (!transaction) return prev;

      // Move to completed
      const completedTransaction = {
        ...transaction,
        ...result,
        status: 'COMPLETED',
        completedAt: new Date().toISOString()
      };

      setCompletedTransactions(prevCompleted => [...prevCompleted, completedTransaction]);

      // Remove from pending
      return prev.filter(tx => tx.logId !== transactionId && tx.nftId !== transactionId);
    });

    console.log('✅ Marked transaction as completed:', transactionId);
  }, []);

  /**
   * Remove transaction from pending (for failed transactions)
   * @param {string} transactionId - Transaction ID
   */
  const removeTransaction = useCallback((transactionId) => {
    setPendingTransactions(prev => 
      prev.filter(tx => tx.logId !== transactionId && tx.nftId !== transactionId)
    );
    console.log('🗑️ Removed transaction from localStorage:', transactionId);
  }, []);

  /**
   * Clear all transactions
   */
  const clearAllTransactions = useCallback(() => {
    setPendingTransactions([]);
    setCompletedTransactions([]);
    localStorage.removeItem(STORAGE_KEY);
    console.log('🧹 Cleared all transactions from localStorage');
  }, []);

  /**
   * Get transactions for a specific game and user
   * @param {string} gameType - Game type
   * @param {string} userAddress - User address
   * @returns {Object} Pending and completed transactions for the game
   */
  const getTransactionsForGame = useCallback((gameType, userAddress) => {
    console.log('🔍 getTransactionsForGame called with:', { gameType, userAddress });
    console.log('🔍 All pending transactions:', pendingTransactions.length);
    console.log('🔍 All completed transactions:', completedTransactions.length);
    
    const gamePending = pendingTransactions.filter(tx => 
      tx.gameType === gameType && tx.playerAddress === userAddress
    );
    
    const gameCompleted = completedTransactions.filter(tx => 
      tx.gameType === gameType && tx.playerAddress === userAddress
    );

    console.log('🔍 Filtered results:', { 
      pending: gamePending.length, 
      completed: gameCompleted.length 
    });

    return {
      pending: gamePending,
      completed: gameCompleted
    };
  }, [pendingTransactions, completedTransactions]);

  return {
    pendingTransactions,
    completedTransactions,
    addPendingTransaction,
    markTransactionCompleted,
    removeTransaction,
    clearAllTransactions,
    getTransactionsForGame,
    loadTransactionsFromStorage
  };
}

export default useLocalTransactions;