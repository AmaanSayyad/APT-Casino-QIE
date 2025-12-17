import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to poll transaction status from the log-game API
 * @param {string} transactionId - Transaction ID to poll
 * @param {boolean} enabled - Whether to enable polling
 * @returns {Object} Transaction status and data
 */
export function useTransactionStatus(transactionId, enabled = true) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const pollStatus = useCallback(async () => {
    if (!transactionId || !enabled) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/log-game?id=${transactionId}`);
      const result = await response.json();

      if (result.success) {
        setStatus(result.transaction);
        
        // Stop polling if transaction is completed or failed
        if (result.transaction.status === 'COMPLETED' || result.transaction.status === 'FAILED') {
          return result.transaction;
        }
      } else {
        setError(result.error || 'Failed to get transaction status');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }

    return null;
  }, [transactionId, enabled]);

  useEffect(() => {
    if (!transactionId || !enabled) return;

    // Initial poll
    pollStatus();

    // Set up polling interval (every 2 seconds)
    const interval = setInterval(async () => {
      const result = await pollStatus();
      if (result && (result.status === 'COMPLETED' || result.status === 'FAILED')) {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [transactionId, enabled, pollStatus]);

  return {
    status,
    loading,
    error,
    refetch: pollStatus
  };
}

/**
 * Hook to manage multiple transaction statuses
 * @param {Array} transactionIds - Array of transaction IDs to poll
 * @returns {Object} Combined status and utilities
 */
export function useMultipleTransactionStatus(transactionIds = []) {
  const [statuses, setStatuses] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const pollAllStatuses = useCallback(async () => {
    if (!transactionIds.length) return;

    try {
      setLoading(true);
      setError(null);

      const promises = transactionIds.map(async (id) => {
        try {
          const response = await fetch(`/api/log-game?id=${id}`);
          const result = await response.json();
          return { id, result: result.success ? result.transaction : null };
        } catch (err) {
          return { id, result: null, error: err.message };
        }
      });

      const results = await Promise.all(promises);
      
      const newStatuses = {};
      results.forEach(({ id, result, error }) => {
        newStatuses[id] = { status: result, error };
      });

      setStatuses(newStatuses);

      // Check if all transactions are completed or failed
      const allCompleted = results.every(({ result }) => 
        result && (result.status === 'COMPLETED' || result.status === 'FAILED')
      );

      return allCompleted;

    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [transactionIds]);

  useEffect(() => {
    if (!transactionIds.length) return;

    // Initial poll
    pollAllStatuses();

    // Set up polling interval
    const interval = setInterval(async () => {
      const allCompleted = await pollAllStatuses();
      if (allCompleted) {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [transactionIds, pollAllStatuses]);

  return {
    statuses,
    loading,
    error,
    refetch: pollAllStatuses
  };
}

export default useTransactionStatus;