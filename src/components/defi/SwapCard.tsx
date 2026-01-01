"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRightLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Wallet,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import {
  useAccount,
  useConnect,
  useSendTransaction,
  useWaitForTransactionReceipt,
  useSwitchChain,
  useChainId,
  useEstimateGas,
  injected,
} from "wagmi";
import { parseEther, formatEther, type Hash } from "viem";
import { isTokenSupportedOnChain, type SupportedChain } from "@/lib/schemas";
import { chainIdToName } from "@/lib/wagmi";
import {
  getTransactionExplorerUrl,
  getChainIdSafe,
  CHAIN_CONFIG,
} from "@/lib/chains";
import {
  createTransactionApproval,
  approveTransaction,
  rejectTransaction,
  isApprovalValid,
  validateTransactionParams,
  type TransactionApproval,
} from "@/lib/security";

/**
 * Transaction state for lifecycle management
 */
export type TransactionStatus =
  | "idle"
  | "preparing"
  | "pending"
  | "confirming"
  | "success"
  | "error";

export interface TransactionState {
  status: TransactionStatus;
  hash?: Hash;
  error?: string;
  gasEstimate?: bigint;
}

export interface SwapCardProps {
  tokenIn: string;
  tokenOut: string;
  amount: number;
  chain: string;
  onSwapComplete?: (hash: Hash) => void;
  onError?: (error: string) => void;
}

/**
 * Get block explorer URL for a transaction
 * Uses centralized chain configuration
 */
function getExplorerUrl(chainName: string, hash: Hash): string {
  return getTransactionExplorerUrl(chainName, hash);
}

/**
 * Get chain ID from chain name safely
 */
function getTargetChainId(chainName: string): number {
  return getChainIdSafe(chainName);
}

/**
 * SwapCard Component
 * 
 * Interactive swap interface with editable amount input.
 * Integrates Wagmi hooks for wallet connection, transaction sending,
 * and transaction receipt waiting.
 * 
 * SECURITY: All transactions require explicit user approval.
 * No automatic transaction execution is allowed.
 * 
 * Requirements: 5.1, 5.3, 4.2, 4.3, 2.4, 4.4
 */
export function SwapCard({
  tokenIn,
  tokenOut,
  amount: initialAmount,
  chain,
  onSwapComplete,
  onError,
}: SwapCardProps) {
  // Editable amount state
  const [amount, setAmount] = useState<string>(initialAmount.toString());
  const [txState, setTxState] = useState<TransactionState>({ status: "idle" });
  
  // Transaction approval state - ensures no automatic execution
  const [approval, setApproval] = useState<TransactionApproval | null>(null);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  // Transaction hooks
  const {
    sendTransaction,
    data: txHash,
    isPending: isSending,
    error: sendError,
    reset: resetSend,
  } = useSendTransaction();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Gas estimation (simplified - in production would use actual swap contract)
  const { data: gasEstimate } = useEstimateGas({
    to: address,
    value: parseEther("0"),
  });

  // Target chain ID
  const targetChainId = getTargetChainId(chain);
  const isCorrectChain = chainId === targetChainId;

  // Validate tokens on chain
  const isTokenInValid = isTokenSupportedOnChain(tokenIn, chain.toLowerCase() as SupportedChain);
  const isTokenOutValid = isTokenSupportedOnChain(tokenOut, chain.toLowerCase() as SupportedChain);
  const areTokensValid = isTokenInValid && isTokenOutValid;

  // Validate transaction parameters when amount changes
  useEffect(() => {
    const validation = validateTransactionParams({
      tokenIn,
      tokenOut,
      amount,
      chain,
    });
    setValidationWarnings(validation.warnings);
  }, [tokenIn, tokenOut, amount, chain]);

  // Update transaction state based on hooks
  useEffect(() => {
    if (isSending) {
      setTxState({ status: "pending" });
    } else if (isConfirming && txHash) {
      setTxState({ status: "confirming", hash: txHash });
    } else if (isConfirmed && txHash) {
      setTxState({ status: "success", hash: txHash });
      onSwapComplete?.(txHash);
    } else if (sendError) {
      const errorMsg = sendError.message || "Transaction failed";
      setTxState({ status: "error", error: errorMsg });
      onError?.(errorMsg);
    } else if (confirmError) {
      const errorMsg = confirmError.message || "Transaction confirmation failed";
      setTxState({ status: "error", error: errorMsg, hash: txHash });
      onError?.(errorMsg);
    }
  }, [isSending, isConfirming, isConfirmed, sendError, confirmError, txHash, onSwapComplete, onError]);

  // Update gas estimate
  useEffect(() => {
    if (gasEstimate) {
      setTxState((prev) => ({ ...prev, gasEstimate }));
    }
  }, [gasEstimate]);

  // Handle wallet connection
  const handleConnect = useCallback(() => {
    connect({ connector: injected() });
  }, [connect]);

  // Handle network switch
  const handleSwitchNetwork = useCallback(() => {
    switchChain({ chainId: targetChainId });
  }, [switchChain, targetChainId]);

  /**
   * Prepare transaction for user review
   * Creates an approval record but does NOT execute the transaction
   * 
   * Requirements: 2.4 - Never execute transactions automatically
   */
  const handlePrepareSwap = useCallback(() => {
    if (!isConnected || !isCorrectChain || !areTokensValid) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setTxState({ status: "error", error: "Invalid amount" });
      return;
    }

    // Create approval record - transaction is NOT executed yet
    const newApproval = createTransactionApproval({
      type: "swap",
      tokenIn: tokenIn.toUpperCase(),
      tokenOut: tokenOut.toUpperCase(),
      amount: amount,
      chain,
    });
    
    setApproval(newApproval);
    setTxState({ status: "preparing" });
  }, [isConnected, isCorrectChain, areTokensValid, amount, tokenIn, tokenOut, chain]);

  /**
   * Execute transaction ONLY after explicit user approval
   * 
   * Requirements: 4.2 - Require explicit user approval through wallet signature
   * Requirements: 4.4 - Never execute transactions without user consent
   */
  const handleConfirmSwap = useCallback(() => {
    if (!approval || !isApprovalValid(approval)) {
      setTxState({ status: "error", error: "Transaction approval expired. Please try again." });
      setApproval(null);
      return;
    }

    // Mark as user approved
    const approvedTx = approveTransaction(approval);
    setApproval(approvedTx);

    // Now execute the transaction - user has explicitly approved
    // In a real implementation, this would call a DEX router contract
    sendTransaction({
      to: address!, // Self-transfer as placeholder
      value: BigInt(0),
    });
  }, [approval, address, sendTransaction]);

  /**
   * Cancel/reject the prepared transaction
   */
  const handleCancelSwap = useCallback(() => {
    if (approval) {
      const rejectedTx = rejectTransaction(approval);
      setApproval(rejectedTx);
    }
    setApproval(null);
    setTxState({ status: "idle" });
  }, [approval]);

  // Reset transaction state
  const handleReset = useCallback(() => {
    setTxState({ status: "idle" });
    setApproval(null);
    resetSend();
  }, [resetSend]);

  // Amount validation
  const parsedAmount = parseFloat(amount);
  const isAmountValid = !isNaN(parsedAmount) && parsedAmount > 0;
  
  // Check if we're in approval review state
  const isAwaitingApproval = approval?.state === "pending_review" && txState.status === "preparing";

  // Render status badge
  // Get chain color for network indicator
  const chainConfig = CHAIN_CONFIG[chain.toLowerCase() as SupportedChain];
  const chainColor = chainConfig?.color || "#888";

  const renderStatusBadge = () => {
    switch (txState.status) {
      case "preparing":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30">Preparing</Badge>;
      case "pending":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">Pending</Badge>;
      case "confirming":
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">Confirming</Badge>;
      case "success":
        return <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">Success</Badge>;
      case "error":
        return <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">Error</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="glass-card border-violet-500/20 overflow-hidden">
      <CardHeader className="p-4 pb-2 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-pink-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <ArrowRightLeft className="h-4 w-4 text-white" />
            </div>
            <CardTitle className="text-base font-semibold gradient-text">Token Swap</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className="text-xs capitalize flex items-center gap-1.5 border-white/20"
              style={{ borderColor: `${chainColor}40` }}
            >
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: chainColor }}
              />
              {chainConfig?.name || chain}
            </Badge>
            {renderStatusBadge()}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2 space-y-4">
        {/* Token Display */}
        <div className="flex items-center justify-between p-3 glass rounded-lg border border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">From:</span>
            <span className="font-medium text-violet-300">{tokenIn.toUpperCase()}</span>
            {!isTokenInValid && (
              <AlertCircle className="h-4 w-4 text-red-400" />
            )}
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-500/20 to-pink-500/20 flex items-center justify-center">
            <ArrowRightLeft className="h-4 w-4 text-violet-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">To:</span>
            <span className="font-medium text-pink-300">{tokenOut.toUpperCase()}</span>
            {!isTokenOutValid && (
              <AlertCircle className="h-4 w-4 text-red-400" />
            )}
          </div>
        </div>

        {/* Editable Amount Input */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Amount</label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              min="0"
              step="any"
              disabled={txState.status !== "idle"}
              className={`glass border-white/10 focus:border-violet-500/50 ${!isAmountValid && amount !== "" ? "border-red-500/50" : ""}`}
            />
            <span className="text-sm font-medium text-violet-300 min-w-[60px]">
              {tokenIn.toUpperCase()}
            </span>
          </div>
          {!isAmountValid && amount !== "" && (
            <p className="text-xs text-red-400">Please enter a valid amount</p>
          )}
        </div>

        {/* Gas Estimate */}
        {txState.gasEstimate && txState.status === "idle" && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <span className="text-violet-400">⛽</span> Estimated gas: {formatEther(txState.gasEstimate)} ETH
          </div>
        )}

        {/* Transaction Status Messages */}
        {txState.status === "preparing" && (
          <div className="flex items-center gap-2 text-sm text-violet-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Preparing transaction...
          </div>
        )}

        {txState.status === "pending" && (
          <div className="flex items-center gap-2 text-sm text-blue-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Waiting for wallet confirmation...
          </div>
        )}

        {txState.status === "confirming" && (
          <div className="flex items-center gap-2 text-sm text-purple-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Confirming transaction...
          </div>
        )}

        {txState.status === "success" && txState.hash && (
          <div className="p-3 glass border border-green-500/20 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">Transaction Successful!</span>
            </div>
            <a
              href={getExplorerUrl(chain, txState.hash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors"
            >
              View on Explorer
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {txState.status === "error" && txState.error && (
          <div className="p-3 glass border border-red-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{txState.error}</span>
            </div>
          </div>
        )}

        {/* Token Validation Errors */}
        {!areTokensValid && (
          <div className="p-3 glass border border-red-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4" />
              {!isTokenInValid && !isTokenOutValid
                ? `${tokenIn} and ${tokenOut} are not supported on ${chain}`
                : !isTokenInValid
                ? `${tokenIn} is not supported on ${chain}`
                : `${tokenOut} is not supported on ${chain}`}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0 flex flex-col gap-2">
        {/* Validation Warnings */}
        {validationWarnings.length > 0 && txState.status === "idle" && (
          <div className="w-full p-2 glass border border-yellow-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-500 text-xs">
              <ShieldAlert className="h-4 w-4" />
              <span>{validationWarnings.join(". ")}</span>
            </div>
          </div>
        )}

        {/* Not Connected */}
        {!isConnected && (
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white border-0 shadow-lg shadow-violet-500/25"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4 mr-2" />
                Connect Wallet
              </>
            )}
          </Button>
        )}

        {/* Wrong Network */}
        {isConnected && !isCorrectChain && (
          <Button
            onClick={handleSwitchNetwork}
            disabled={isSwitching}
            variant="outline"
            className="w-full glass-button border-white/20 hover:border-violet-500/30"
          >
            {isSwitching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Switching...
              </>
            ) : (
              <>
                Switch to {chainIdToName[targetChainId] || chain}
              </>
            )}
          </Button>
        )}

        {/* Ready to Prepare Swap - Initial State */}
        {isConnected && isCorrectChain && txState.status === "idle" && (
          <Button
            onClick={handlePrepareSwap}
            disabled={!isAmountValid || !areTokensValid}
            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white border-0 shadow-lg shadow-violet-500/25"
          >
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Review Swap
          </Button>
        )}

        {/* Awaiting User Approval - Two-Step Confirmation */}
        {isConnected && isCorrectChain && isAwaitingApproval && (
          <div className="w-full space-y-2">
            <div className="p-3 glass border border-blue-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-sm font-medium">Review Transaction</span>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Swap {amount} {tokenIn.toUpperCase()} → {tokenOut.toUpperCase()}</p>
                <p>Network: {chainConfig?.name || chain}</p>
                {txState.gasEstimate && (
                  <p>Est. Gas: {formatEther(txState.gasEstimate)} ETH</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCancelSwap}
                variant="outline"
                className="flex-1 glass-button border-white/20"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmSwap}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0"
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                Confirm & Sign
              </Button>
            </div>
          </div>
        )}

        {/* Transaction in Progress (after user approval) */}
        {isConnected && isCorrectChain && ["pending", "confirming"].includes(txState.status) && (
          <Button disabled className="w-full glass-button border-white/20">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {txState.status === "pending" && "Confirm in Wallet..."}
            {txState.status === "confirming" && "Confirming..."}
          </Button>
        )}

        {/* Transaction Complete or Error - Reset */}
        {isConnected && isCorrectChain && ["success", "error"].includes(txState.status) && (
          <Button onClick={handleReset} variant="outline" className="w-full glass-button border-white/20 hover:border-violet-500/30">
            {txState.status === "success" ? "New Swap" : "Try Again"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
