import React, { useEffect, useCallback, useContext, createContext } from 'react';
import { useLocalTransactions } from './useLocalTransactions';
import { useTransactionStatus } from './useTransactionStatus';

// Global context so all components share the same transaction manager instance
const QIETransactionContext = createContext(null);

/**
 * Internal hook that actually wires up localStorage-backed transactions.
 * This should only be used by the provider to ensure a single source of truth.
 */
function useProvideQIETransactionManager() {
  const {
    pendingTransactions,
    completedTransactions,
    addPendingTransaction,
    markTransactionCompleted,
    removeTransaction,
    getTransactionsForGame,
  } = useLocalTransactions();

  /**
   * Start a new game transaction (both LOG and NFT)
   * @param {Object} gameResult - Game result from API
   */
  const startGameTransaction = useCallback(
    (gameResult) => {
      if (!gameResult?.success || !gameResult.transactions) {
        console.warn('⚠️ Invalid game result for transaction tracking');
        return;
      }

      const { transactions } = gameResult;

      // Add both LOG and NFT transactions to pending
      const transactionData = {
        logId: transactions.log?.id,
        nftId: transactions.nft?.id,
        gameType: gameResult.gameType || 'UNKNOWN',
        playerAddress: gameResult.playerAddress || 'UNKNOWN',
        betAmount: gameResult.betAmount,
        payout: gameResult.payout,
        createdAt: new Date().toISOString(),
      };

      console.log('🎮 Adding transaction to localStorage:', transactionData);
      addPendingTransaction(transactionData);

      console.log('🎮 Started tracking game transaction:', transactionData);
    },
    [addPendingTransaction],
  );

  return {
    // Transaction lists
    pendingTransactions,
    completedTransactions,

    // Actions
    startGameTransaction,
    markTransactionCompleted,
    removeTransaction,
    getTransactionsForGame,

    // Utils
    hasPendingTransactions: pendingTransactions.length > 0,
  };
}

/**
 * Provider component that makes the QIE transaction manager global.
 * Wrap this around the app in `app/providers.js` so all pages share the same state.
 */
export function QIETransactionManagerProvider({ children }) {
  const manager = useProvideQIETransactionManager();

  return (
    <QIETransactionContext.Provider value={manager}>
      {children}
    </QIETransactionContext.Provider>
  );
}

/**
 * Public hook to access the shared QIE transaction manager.
 * MUST be used within `QIETransactionManagerProvider`.
 */
export function useQIETransactionManager() {
  const ctx = useContext(QIETransactionContext);

  if (!ctx) {
    throw new Error(
      'useQIETransactionManager must be used within a QIETransactionManagerProvider',
    );
  }

  return ctx;
}

/**
 * Hook to poll a specific transaction and update localStorage
 * @param {string} transactionId - Transaction ID to poll
 * @param {boolean} enabled - Whether polling is enabled
 */
export function useQIETransactionPoller(transactionId, enabled = true) {
  const { markTransactionCompleted, removeTransaction } = useQIETransactionManager();
  const { status, loading, error } = useTransactionStatus(transactionId, enabled);

  useEffect(() => {
    if (!status || !transactionId) return;

    if (status.status === 'COMPLETED' && status.result) {
      // Mark as completed in localStorage
      markTransactionCompleted(transactionId, {
        txHash: status.result.txHash,
        blockNumber: status.result.blockNumber,
        tokenId: status.result.tokenId,
        explorerUrl: status.result.explorerUrl,
        nftUrl: status.result.nftUrl,
      });
    } else if (status.status === 'FAILED') {
      // Remove failed transaction after some time
      setTimeout(() => {
        removeTransaction(transactionId);
      }, 5000);
    }
  }, [status, transactionId, markTransactionCompleted, removeTransaction]);

  return { status, loading, error };
}

/**
 * Hook to automatically poll all pending transactions
 */
export function useQIETransactionAutoPoller() {
  const { pendingTransactions, markTransactionCompleted, removeTransaction } =
    useQIETransactionManager();

  // Lightweight internal polling that does NOT call hooks in a loop,
  // to respect the Rules of Hooks.
  useEffect(() => {
    if (!pendingTransactions.length) return undefined;

    const intervals = [];

    pendingTransactions.forEach((tx) => {
      // Önce NFT tx'ini takip et, yoksa LOG tx'ine düş
      const id = tx.nftId || tx.logId;
      if (!id) return;

      const intervalId = setInterval(async () => {
        try {
          const res = await fetch(`/api/log-game?id=${id}`);
          const data = await res.json();
          if (!data.success || !data.transaction) return;

          const txStatus = data.transaction;

          if (txStatus.status === 'COMPLETED' && txStatus.result) {
            markTransactionCompleted(id, {
              txHash: txStatus.result.txHash,
              blockNumber: txStatus.result.blockNumber,
              tokenId: txStatus.result.tokenId,
              explorerUrl: txStatus.result.explorerUrl,
              nftUrl: txStatus.result.nftUrl,
            });
            clearInterval(intervalId);
          } else if (txStatus.status === 'FAILED') {
            clearInterval(intervalId);
            setTimeout(() => {
              removeTransaction(id);
            }, 5000);
          }
        } catch (err) {
          // Sessiz fail; bir sonraki interval tekrar deneyecek.
          // İstersek burada logging yapabiliriz.
          console.error('Failed to poll transaction status', err);
        }
      }, 2000);

      intervals.push(intervalId);
    });

    return () => {
      intervals.forEach((id) => clearInterval(id));
    };
  }, [pendingTransactions, markTransactionCompleted, removeTransaction]);

  const isPolling = pendingTransactions.length > 0;
  const hasErrors = false;

  return {
    isPolling,
    hasErrors,
    pendingCount: pendingTransactions.length,
  };
}

export default useQIETransactionManager;


