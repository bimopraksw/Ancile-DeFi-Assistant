"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useSendTransaction,
  useWaitForTransactionReceipt,
  useEstimateGas,
} from "wagmi";
import { type Hash, type Address } from "viem";

/**
 * Transaction status for lifecycle management
 * Requirements: 5.4, 5.5, 7.2
 */
export type TransactionStatus =
  | "idle"
  | "simulating"
  | "preparing"
  | "pending"
  | "confirming"
  | "success"
  | "error";

/**
 * Simulation result for transaction preview
 */
export interface SimulationResult {
  success: boolean;
  gasUsed?: bigint;
  error?: string;
}

/**
 * Complete transaction state
 */
export interface TransactionLifecycleState {
  status: TransactionStatus;
  hash?: Hash;
  error?: string;
  gasEstimate?: bigint;
  simulation?: SimulationResult;
}

/**
 * Transaction configuration for sending
 */
export interface TransactionConfig {
  to: Address;
  value?: bigint;
  data?: `0x${string}`;
}

/**
 * Hook return type
 */
export interface UseTransactionLifecycleReturn {
  state: TransactionLifecycleState;
  sendTx: (config: TransactionConfig) => void;
  reset: () => void;
  isLoading: boolean;
  canSubmit: boolean;
}

/**
 * Custom hook for managing transaction lifecycle
 * 
 * Handles the complete transaction flow:
 * 1. Gas estimation
 * 2. Transaction simulation (optional)
 * 3. Transaction submission
 * 4. Confirmation waiting
 * 5. Success/Error handling
 * 
 * Requirements: 5.4, 5.5, 7.2
 */
export function useTransactionLifecycle(
  onSuccess?: (hash: Hash) => void,
  onError?: (error: string) => void
): UseTransactionLifecycleReturn {
  const [state, setState] = useState<TransactionLifecycleState>({
    status: "idle",
  });
  const [txConfig, setTxConfig] = useState<TransactionConfig | null>(null);

  // Transaction sending hook
  const {
    sendTransaction,
    data: txHash,
    isPending: isSending,
    error: sendError,
    reset: resetSend,
  } = useSendTransaction();

  // Transaction confirmation hook
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Gas estimation hook
  const { data: gasEstimate, error: gasError } = useEstimateGas(
    txConfig
      ? {
          to: txConfig.to,
          value: txConfig.value,
          data: txConfig.data,
        }
      : undefined
  );

  // Update state based on transaction progress
  useEffect(() => {
    if (isSending) {
      setState((prev) => ({ ...prev, status: "pending" }));
    }
  }, [isSending]);

  useEffect(() => {
    if (isConfirming && txHash) {
      setState((prev) => ({ ...prev, status: "confirming", hash: txHash }));
    }
  }, [isConfirming, txHash]);

  useEffect(() => {
    if (isConfirmed && txHash) {
      setState((prev) => ({ ...prev, status: "success", hash: txHash }));
      onSuccess?.(txHash);
    }
  }, [isConfirmed, txHash, onSuccess]);

  useEffect(() => {
    if (sendError) {
      const errorMsg = sendError.message || "Transaction failed";
      setState((prev) => ({ ...prev, status: "error", error: errorMsg }));
      onError?.(errorMsg);
    }
  }, [sendError, onError]);

  useEffect(() => {
    if (confirmError) {
      const errorMsg = confirmError.message || "Transaction confirmation failed";
      setState((prev) => ({
        ...prev,
        status: "error",
        error: errorMsg,
        hash: txHash,
      }));
      onError?.(errorMsg);
    }
  }, [confirmError, txHash, onError]);

  // Update gas estimate
  useEffect(() => {
    if (gasEstimate) {
      setState((prev) => ({ ...prev, gasEstimate }));
    }
  }, [gasEstimate]);

  // Handle gas estimation error
  useEffect(() => {
    if (gasError && state.status === "simulating") {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: "Gas estimation failed: " + gasError.message,
        simulation: { success: false, error: gasError.message },
      }));
    }
  }, [gasError, state.status]);

  /**
   * Send a transaction with the given configuration
   */
  const sendTx = useCallback(
    (config: TransactionConfig) => {
      setTxConfig(config);
      setState({ status: "preparing" });

      // Small delay to allow gas estimation to complete
      setTimeout(() => {
        sendTransaction({
          to: config.to,
          value: config.value,
          data: config.data,
        });
      }, 100);
    },
    [sendTransaction]
  );

  /**
   * Reset the transaction state
   */
  const reset = useCallback(() => {
    setState({ status: "idle" });
    setTxConfig(null);
    resetSend();
  }, [resetSend]);

  // Computed properties
  const isLoading = ["simulating", "preparing", "pending", "confirming"].includes(
    state.status
  );
  const canSubmit = state.status === "idle" || state.status === "error";

  return {
    state,
    sendTx,
    reset,
    isLoading,
    canSubmit,
  };
}

/**
 * Get user-friendly status message
 */
export function getStatusMessage(status: TransactionStatus): string {
  switch (status) {
    case "idle":
      return "Ready";
    case "simulating":
      return "Simulating transaction...";
    case "preparing":
      return "Preparing transaction...";
    case "pending":
      return "Waiting for wallet confirmation...";
    case "confirming":
      return "Confirming on blockchain...";
    case "success":
      return "Transaction successful!";
    case "error":
      return "Transaction failed";
    default:
      return "Unknown status";
  }
}

/**
 * Get status color class for UI
 */
export function getStatusColor(status: TransactionStatus): string {
  switch (status) {
    case "idle":
      return "text-muted-foreground";
    case "simulating":
    case "preparing":
      return "text-yellow-600";
    case "pending":
      return "text-blue-600";
    case "confirming":
      return "text-purple-600";
    case "success":
      return "text-green-600";
    case "error":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
}
