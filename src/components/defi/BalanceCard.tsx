"use client";

import React, { useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wallet,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
} from "lucide-react";
import {
  useAccount,
  useConnect,
  useBalance,
  useSwitchChain,
  useChainId,
  injected,
} from "wagmi";
import { formatUnits } from "viem";
import { isTokenSupportedOnChain, type SupportedChain } from "@/lib/schemas";
import { chainIdToName } from "@/lib/wagmi";
import {
  getAddressExplorerUrl,
  getChainIdSafe,
  isNativeTokenSafe,
  CHAIN_CONFIG,
} from "@/lib/chains";

export interface BalanceCardProps {
  token: string;
  chain: string;
  onBalanceFetched?: (balance: string, decimals: number) => void;
  onError?: (error: string) => void;
}

/**
 * Get block explorer URL for an address - use centralized function
 */
function getExplorerAddressUrlForChain(chainName: string, address: string): string {
  return getAddressExplorerUrl(chainName, address);
}

/**
 * Token metadata for display
 */
interface TokenMetadata {
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
}

/**
 * Get token metadata (simplified - in production would fetch from token list)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getTokenMetadata(token: string, _chain: string): TokenMetadata {
  const upperToken = token.toUpperCase();
  
  // Common token metadata
  const tokenData: Record<string, Partial<TokenMetadata>> = {
    ETH: { name: "Ethereum", decimals: 18 },
    USDC: { name: "USD Coin", decimals: 6 },
    USDT: { name: "Tether USD", decimals: 6 },
    DAI: { name: "Dai Stablecoin", decimals: 18 },
    WETH: { name: "Wrapped Ether", decimals: 18 },
    WBTC: { name: "Wrapped Bitcoin", decimals: 8 },
    MATIC: { name: "Polygon", decimals: 18 },
    BNB: { name: "BNB", decimals: 18 },
    AVAX: { name: "Avalanche", decimals: 18 },
    OP: { name: "Optimism", decimals: 18 },
    ARB: { name: "Arbitrum", decimals: 18 },
    LINK: { name: "Chainlink", decimals: 18 },
    UNI: { name: "Uniswap", decimals: 18 },
    AAVE: { name: "Aave", decimals: 18 },
  };

  const data = tokenData[upperToken] || { name: upperToken, decimals: 18 };
  
  return {
    symbol: upperToken,
    name: data.name || upperToken,
    decimals: data.decimals || 18,
    logoUrl: data.logoUrl,
  };
}

/**
 * BalanceCard Component
 * 
 * Displays wallet balance with network identification.
 * Uses Wagmi hooks for real-time balance fetching.
 * 
 * Requirements: 5.2, 8.4
 */
export function BalanceCard({
  token,
  chain,
  onBalanceFetched,
  onError,
}: BalanceCardProps) {
  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  // Target chain ID
  const targetChainId = getChainIdSafe(chain);
  const isCorrectChain = chainId === targetChainId;
  const chainDisplayName = chainIdToName[targetChainId] || chain;

  // Check if token is native
  const isNativeToken = isNativeTokenSafe(token, chain);

  // Validate token on chain
  const isTokenValid = isTokenSupportedOnChain(token, chain.toLowerCase() as SupportedChain);

  // Get token metadata
  const tokenMetadata = getTokenMetadata(token, chain);

  // Balance hook - only fetch native token balance for now
  // In production, would use useContractRead for ERC20 tokens
  const {
    data: balanceData,
    isLoading: isBalanceLoading,
    isError: isBalanceError,
    error: balanceError,
    refetch: refetchBalance,
  } = useBalance({
    address: address,
    chainId: targetChainId,
    query: {
      enabled: isConnected && isCorrectChain && isNativeToken,
    },
  });

  // Notify parent of balance changes
  useEffect(() => {
    if (balanceData && onBalanceFetched) {
      const formatted = formatUnits(balanceData.value, balanceData.decimals);
      onBalanceFetched(formatted, balanceData.decimals);
    }
  }, [balanceData, onBalanceFetched]);

  // Notify parent of errors
  useEffect(() => {
    if (balanceError && onError) {
      onError(balanceError.message);
    }
  }, [balanceError, onError]);

  // Handle wallet connection
  const handleConnect = useCallback(() => {
    connect({ connector: injected() });
  }, [connect]);

  // Handle network switch
  const handleSwitchNetwork = useCallback(() => {
    switchChain({ chainId: targetChainId });
  }, [switchChain, targetChainId]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refetchBalance();
  }, [refetchBalance]);

  // Format balance for display
  const formatBalance = (value: bigint, decimals: number): string => {
    const formatted = formatUnits(value, decimals);
    const num = parseFloat(formatted);
    if (num === 0) return "0";
    if (num < 0.0001) return "< 0.0001";
    if (num < 1) return num.toFixed(4);
    if (num < 1000) return num.toFixed(2);
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  // Get chain color for network indicator
  const chainConfig = CHAIN_CONFIG[chain.toLowerCase() as SupportedChain];
  const chainColor = chainConfig?.color || "#888";

  return (
    <Card className="glass-card border-violet-500/20 overflow-hidden">
      <CardHeader className="p-4 pb-2 bg-gradient-to-r from-blue-500/10 via-violet-500/10 to-purple-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-white" />
            </div>
            <CardTitle className="text-base font-semibold gradient-text">Balance Check</CardTitle>
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
              {chainDisplayName}
            </Badge>
            {isConnected && isCorrectChain && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-white/10"
                onClick={handleRefresh}
                disabled={isBalanceLoading}
              >
                <RefreshCw className={`h-3 w-3 text-violet-400 ${isBalanceLoading ? "animate-spin" : ""}`} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2 space-y-4">
        {/* Token Info */}
        <div className="flex items-center justify-between p-3 glass rounded-lg border border-white/10">
          <div className="flex items-center gap-3">
            {/* Token Logo Placeholder */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/30 to-purple-500/30 flex items-center justify-center ring-2 ring-violet-500/20">
              <span className="text-sm font-bold text-violet-300">
                {token.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-medium text-violet-200">{tokenMetadata.symbol}</p>
              <p className="text-xs text-muted-foreground">{tokenMetadata.name}</p>
            </div>
          </div>
          {!isTokenValid && (
            <div className="flex items-center gap-1 text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs">Not supported</span>
            </div>
          )}
        </div>

        {/* Balance Display */}
        {isConnected && isCorrectChain && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Your Balance</p>
            {isBalanceLoading ? (
              <Skeleton className="h-8 w-32 bg-white/10" />
            ) : isBalanceError ? (
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Failed to fetch balance</span>
              </div>
            ) : balanceData ? (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold gradient-text">
                  {formatBalance(balanceData.value, balanceData.decimals)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {balanceData.symbol}
                </span>
              </div>
            ) : !isNativeToken ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-4 w-4 text-violet-400" />
                <span className="text-sm">ERC20 balance check coming soon</span>
              </div>
            ) : null}
          </div>
        )}

        {/* Connected Address */}
        {isConnected && address && (
          <div className="pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Connected Wallet</p>
              <a
                href={getExplorerAddressUrlForChain(chain, address)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                {`${address.slice(0, 6)}...${address.slice(-4)}`}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}

        {/* Token Validation Error */}
        {!isTokenValid && (
          <div className="p-3 glass border border-red-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4" />
              {token} is not supported on {chainDisplayName}
            </div>
          </div>
        )}

        {/* Success State */}
        {isConnected && isCorrectChain && balanceData && !isBalanceLoading && (
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle2 className="h-4 w-4" />
            Balance fetched successfully
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0">
        {/* Not Connected */}
        {!isConnected && (
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white border-0 shadow-lg shadow-violet-500/25"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4 mr-2" />
                Connect Wallet to View Balance
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
                Switch to {chainDisplayName}
              </>
            )}
          </Button>
        )}

        {/* Connected and Correct Chain - Show Refresh */}
        {isConnected && isCorrectChain && (
          <Button
            onClick={handleRefresh}
            disabled={isBalanceLoading}
            variant="outline"
            className="w-full glass-button border-white/20 hover:border-violet-500/30"
          >
            {isBalanceLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Balance
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
