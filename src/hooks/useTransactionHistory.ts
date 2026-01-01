"use client";

import { useState, useEffect, useCallback } from "react";
import { useChainId } from "wagmi";
import {
  getTransactionHistoryKey,
  type TransactionHistoryEntry,
  CHAIN_ID_TO_NAME,
} from "@/lib/chains";
import type { SupportedChain } from "@/lib/schemas";

/**
 * Maximum number of transactions to store per chain
 */
const MAX_TRANSACTIONS_PER_CHAIN = 50;

/**
 * Hook for managing chain-specific transaction history
 * 
 * Provides:
 * - Chain-specific transaction storage
 * - Add/remove transactions
 * - Update transaction status
 * - Persist to localStorage
 * 
 * Requirements: 8.5
 */
export function useTransactionHistory(chainId?: number) {
  const currentChainId = useChainId();
  const targetChainId = chainId ?? currentChainId;
  const chainName = CHAIN_ID_TO_NAME[targetChainId];

  const [transactions, setTransactions] = useState<TransactionHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load transactions from localStorage on mount and chain change
  useEffect(() => {
    setIsLoading(true);
    try {
      const key = getTransactionHistoryKey(targetChainId);
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored) as TransactionHistoryEntry[];
        setTransactions(parsed);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error("Failed to load transaction history:", error);
      setTransactions([]);
    }
    setIsLoading(false);
  }, [targetChainId]);

  // Save transactions to localStorage
  const saveTransactions = useCallback(
    (txs: TransactionHistoryEntry[]) => {
      try {
        const key = getTransactionHistoryKey(targetChainId);
        localStorage.setItem(key, JSON.stringify(txs));
      } catch (error) {
        console.error("Failed to save transaction history:", error);
      }
    },
    [targetChainId]
  );

  // Add a new transaction
  const addTransaction = useCallback(
    (tx: Omit<TransactionHistoryEntry, "chainId" | "chainName" | "timestamp">) => {
      if (!chainName) return;

      const newTx: TransactionHistoryEntry = {
        ...tx,
        chainId: targetChainId,
        chainName: chainName as SupportedChain,
        timestamp: Date.now(),
      };

      setTransactions((prev) => {
        const updated = [newTx, ...prev].slice(0, MAX_TRANSACTIONS_PER_CHAIN);
        saveTransactions(updated);
        return updated;
      });
    },
    [targetChainId, chainName, saveTransactions]
  );

  // Update transaction status
  const updateTransactionStatus = useCallback(
    (hash: string, status: TransactionHistoryEntry["status"]) => {
      setTransactions((prev) => {
        const updated = prev.map((tx) =>
          tx.hash === hash ? { ...tx, status } : tx
        );
        saveTransactions(updated);
        return updated;
      });
    },
    [saveTransactions]
  );

  // Remove a transaction
  const removeTransaction = useCallback(
    (hash: string) => {
      setTransactions((prev) => {
        const updated = prev.filter((tx) => tx.hash !== hash);
        saveTransactions(updated);
        return updated;
      });
    },
    [saveTransactions]
  );

  // Clear all transactions for current chain
  const clearHistory = useCallback(() => {
    setTransactions([]);
    try {
      const key = getTransactionHistoryKey(targetChainId);
      localStorage.removeItem(key);
    } catch (error) {
      console.error("Failed to clear transaction history:", error);
    }
  }, [targetChainId]);

  // Get pending transactions
  const pendingTransactions = transactions.filter((tx) => tx.status === "pending");

  // Get confirmed transactions
  const confirmedTransactions = transactions.filter((tx) => tx.status === "confirmed");

  // Get failed transactions
  const failedTransactions = transactions.filter((tx) => tx.status === "failed");

  return {
    transactions,
    pendingTransactions,
    confirmedTransactions,
    failedTransactions,
    isLoading,
    addTransaction,
    updateTransactionStatus,
    removeTransaction,
    clearHistory,
    chainId: targetChainId,
    chainName,
  };
}

/**
 * Hook for getting transaction history across all chains
 */
export function useAllChainsTransactionHistory() {
  const [allTransactions, setAllTransactions] = useState<
    Record<number, TransactionHistoryEntry[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const history: Record<number, TransactionHistoryEntry[]> = {};

    // Load from all supported chains
    Object.keys(CHAIN_ID_TO_NAME).forEach((chainIdStr) => {
      const chainId = parseInt(chainIdStr, 10);
      try {
        const key = getTransactionHistoryKey(chainId);
        const stored = localStorage.getItem(key);
        if (stored) {
          history[chainId] = JSON.parse(stored);
        }
      } catch (error) {
        console.error(`Failed to load history for chain ${chainId}:`, error);
      }
    });

    setAllTransactions(history);
    setIsLoading(false);
  }, []);

  // Get total transaction count
  const totalCount = Object.values(allTransactions).reduce(
    (sum, txs) => sum + txs.length,
    0
  );

  // Get all transactions sorted by timestamp
  const sortedTransactions = Object.values(allTransactions)
    .flat()
    .sort((a, b) => b.timestamp - a.timestamp);

  return {
    allTransactions,
    sortedTransactions,
    totalCount,
    isLoading,
  };
}
