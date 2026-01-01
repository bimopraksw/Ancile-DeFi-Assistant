"use client";

import React, { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Network,
  ChevronDown,
} from "lucide-react";
import { useChainId, useSwitchChain, useAccount } from "wagmi";
import {
  CHAIN_CONFIG,
  getAllChains,
  getChainById,
  type ChainMetadata,
} from "@/lib/chains";
import type { SupportedChain } from "@/lib/schemas";

export interface NetworkSwitcherProps {
  /** Target chain to switch to (if specified, shows as a prompt) */
  targetChain?: string;
  /** Callback when network switch is successful */
  onSwitchSuccess?: (chainId: number) => void;
  /** Callback when network switch fails */
  onSwitchError?: (error: string) => void;
  /** Whether to show as a compact badge or full button */
  variant?: "badge" | "button" | "prompt";
  /** Custom class name */
  className?: string;
}

/**
 * NetworkSwitcher Component
 * 
 * Provides network switching UI with support for:
 * - Displaying current network
 * - Switching to a specific target network (prompt mode)
 * - Selecting from all supported networks (selector mode)
 * 
 * Requirements: 8.3, 8.4, 8.5
 */
export function NetworkSwitcher({
  targetChain,
  onSwitchSuccess,
  onSwitchError,
  variant = "button",
  className,
}: NetworkSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending, error } = useSwitchChain();

  const currentChain = getChainById(chainId);
  const allChains = getAllChains();

  // Handle network switch
  const handleSwitch = useCallback(
    async (targetChainId: number) => {
      try {
        await switchChain({ chainId: targetChainId });
        onSwitchSuccess?.(targetChainId);
        setIsOpen(false);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to switch network";
        onSwitchError?.(errorMsg);
      }
    },
    [switchChain, onSwitchSuccess, onSwitchError]
  );

  // If target chain is specified and we're on wrong network, show prompt
  if (targetChain && variant === "prompt") {
    const targetChainConfig = CHAIN_CONFIG[targetChain.toLowerCase() as SupportedChain];
    if (!targetChainConfig) return null;

    const isCorrectChain = chainId === targetChainConfig.id;
    if (isCorrectChain) return null;

    return (
      <div className={`p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
            Network Mismatch
          </span>
        </div>
        <p className="text-sm text-yellow-600 dark:text-yellow-500 mb-3">
          This operation requires {targetChainConfig.name}. You are currently on{" "}
          {currentChain?.name || "an unsupported network"}.
        </p>
        <Button
          onClick={() => handleSwitch(targetChainConfig.id)}
          disabled={isPending || !isConnected}
          size="sm"
          className="w-full"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Switching...
            </>
          ) : (
            <>
              <Network className="h-4 w-4 mr-2" />
              Switch to {targetChainConfig.name}
            </>
          )}
        </Button>
        {error && (
          <p className="text-xs text-destructive mt-2">{error.message}</p>
        )}
      </div>
    );
  }

  // Badge variant - compact display
  if (variant === "badge") {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Badge
            variant="outline"
            className={`cursor-pointer hover:bg-muted transition-colors ${className}`}
            style={{
              borderColor: currentChain?.color,
              color: currentChain?.color,
            }}
          >
            <span
              className="w-2 h-2 rounded-full mr-1.5"
              style={{ backgroundColor: currentChain?.color }}
            />
            {currentChain?.shortName || "Unknown"}
          </Badge>
        </DialogTrigger>
        <NetworkSelectorDialog
          chains={allChains}
          currentChainId={chainId}
          onSelect={handleSwitch}
          isPending={isPending}
          isConnected={isConnected}
        />
      </Dialog>
    );
  }

  // Button variant - full button with dropdown
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={className} disabled={!isConnected}>
          <span
            className="w-2 h-2 rounded-full mr-2"
            style={{ backgroundColor: currentChain?.color || "#888" }}
          />
          {currentChain?.name || "Select Network"}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DialogTrigger>
      <NetworkSelectorDialog
        chains={allChains}
        currentChainId={chainId}
        onSelect={handleSwitch}
        isPending={isPending}
        isConnected={isConnected}
      />
    </Dialog>
  );
}


/**
 * Network Selector Dialog Content
 */
interface NetworkSelectorDialogProps {
  chains: ChainMetadata[];
  currentChainId: number;
  onSelect: (chainId: number) => void;
  isPending: boolean;
  isConnected: boolean;
}

function NetworkSelectorDialog({
  chains,
  currentChainId,
  onSelect,
  isPending,
  isConnected,
}: NetworkSelectorDialogProps) {
  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Select Network</DialogTitle>
        <DialogDescription>
          Choose a blockchain network to connect to
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-2 py-4">
        {chains.map((chain) => {
          const isCurrentChain = chain.id === currentChainId;
          return (
            <button
              key={chain.id}
              onClick={() => !isCurrentChain && onSelect(chain.id)}
              disabled={isPending || !isConnected || isCurrentChain}
              className={`
                flex items-center justify-between p-3 rounded-lg border transition-colors
                ${isCurrentChain
                  ? "bg-primary/10 border-primary"
                  : "hover:bg-muted border-border"
                }
                ${isPending ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: chain.color }}
                />
                <div className="text-left">
                  <p className="font-medium text-sm">{chain.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {chain.nativeCurrency.symbol}
                  </p>
                </div>
              </div>
              {isCurrentChain && (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              )}
              {isPending && !isCurrentChain && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
            </button>
          );
        })}
      </div>
      {!isConnected && (
        <p className="text-sm text-muted-foreground text-center">
          Connect your wallet to switch networks
        </p>
      )}
    </DialogContent>
  );
}

/**
 * Network Indicator Component
 * 
 * A simple indicator showing the current network with color coding.
 * Used in balance displays and transaction cards.
 * 
 * Requirements: 8.4
 */
export interface NetworkIndicatorProps {
  chainName: string;
  showName?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function NetworkIndicator({
  chainName,
  showName = true,
  size = "md",
  className,
}: NetworkIndicatorProps) {
  const chainConfig = CHAIN_CONFIG[chainName.toLowerCase() as SupportedChain];
  
  if (!chainConfig) {
    return (
      <Badge variant="outline" className={className}>
        Unknown Network
      </Badge>
    );
  }

  const dotSizes = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-3 h-3",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span
        className={`${dotSizes[size]} rounded-full`}
        style={{ backgroundColor: chainConfig.color }}
      />
      {showName && (
        <span className={`${textSizes[size]} font-medium`}>
          {chainConfig.shortName}
        </span>
      )}
    </div>
  );
}

/**
 * Network Mismatch Alert Component
 * 
 * Shows an alert when the user is on the wrong network for an operation.
 * 
 * Requirements: 8.3, 8.5
 */
export interface NetworkMismatchAlertProps {
  requiredChain: string;
  currentChainId: number;
  onSwitch: () => void;
  isPending?: boolean;
  className?: string;
}

export function NetworkMismatchAlert({
  requiredChain,
  currentChainId,
  onSwitch,
  isPending = false,
  className,
}: NetworkMismatchAlertProps) {
  const requiredConfig = CHAIN_CONFIG[requiredChain.toLowerCase() as SupportedChain];
  const currentConfig = getChainById(currentChainId);

  if (!requiredConfig) return null;
  if (currentChainId === requiredConfig.id) return null;

  return (
    <div className={`p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
            Wrong Network
          </p>
          <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-1">
            Please switch from{" "}
            <span className="font-medium">{currentConfig?.name || "Unknown"}</span> to{" "}
            <span className="font-medium">{requiredConfig.name}</span> to continue.
          </p>
          <Button
            onClick={onSwitch}
            disabled={isPending}
            size="sm"
            variant="outline"
            className="mt-2"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                Switching...
              </>
            ) : (
              <>
                <Network className="h-3 w-3 mr-1.5" />
                Switch Network
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
