/**
 * Comprehensive Chain Support Module
 * 
 * Provides chain configuration, validation, switching logic,
 * intelligent default chain selection, and network-specific token validation.
 * 
 * Requirements: 8.1, 8.2, 8.6
 */

import {
  mainnet,
  base,
  optimism,
  arbitrum,
  polygon,
  bsc,
  avalanche,
  type Chain,
} from "wagmi/chains";
import { SUPPORTED_CHAINS, TOKEN_WHITELIST, type SupportedChain } from "./schemas";

// Re-export SupportedChain for convenience
export type { SupportedChain };

/**
 * Chain metadata with additional information for UI and validation
 */
export interface ChainMetadata {
  id: number;
  name: string;
  shortName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorer: string;
  rpcUrl: string;
  iconUrl?: string;
  color: string;
  testnet: boolean;
}

/**
 * Complete chain configuration with metadata
 */
export const CHAIN_CONFIG: Record<SupportedChain, ChainMetadata> = {
  ethereum: {
    id: mainnet.id,
    name: "Ethereum",
    shortName: "ETH",
    nativeCurrency: mainnet.nativeCurrency,
    blockExplorer: "https://etherscan.io",
    rpcUrl: "https://eth.llamarpc.com",
    color: "#627EEA",
    testnet: false,
  },
  base: {
    id: base.id,
    name: "Base",
    shortName: "BASE",
    nativeCurrency: base.nativeCurrency,
    blockExplorer: "https://basescan.org",
    rpcUrl: "https://mainnet.base.org",
    color: "#0052FF",
    testnet: false,
  },
  optimism: {
    id: optimism.id,
    name: "Optimism",
    shortName: "OP",
    nativeCurrency: optimism.nativeCurrency,
    blockExplorer: "https://optimistic.etherscan.io",
    rpcUrl: "https://mainnet.optimism.io",
    color: "#FF0420",
    testnet: false,
  },
  arbitrum: {
    id: arbitrum.id,
    name: "Arbitrum One",
    shortName: "ARB",
    nativeCurrency: arbitrum.nativeCurrency,
    blockExplorer: "https://arbiscan.io",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    color: "#28A0F0",
    testnet: false,
  },
  polygon: {
    id: polygon.id,
    name: "Polygon",
    shortName: "MATIC",
    nativeCurrency: polygon.nativeCurrency,
    blockExplorer: "https://polygonscan.com",
    rpcUrl: "https://polygon-rpc.com",
    color: "#8247E5",
    testnet: false,
  },
  bsc: {
    id: bsc.id,
    name: "BNB Smart Chain",
    shortName: "BSC",
    nativeCurrency: bsc.nativeCurrency,
    blockExplorer: "https://bscscan.com",
    rpcUrl: "https://bsc-dataseed.binance.org",
    color: "#F0B90B",
    testnet: false,
  },
  avalanche: {
    id: avalanche.id,
    name: "Avalanche C-Chain",
    shortName: "AVAX",
    nativeCurrency: avalanche.nativeCurrency,
    blockExplorer: "https://snowtrace.io",
    rpcUrl: "https://api.avax.network/ext/bc/C/rpc",
    color: "#E84142",
    testnet: false,
  },
};

/**
 * Chain ID to chain name mapping
 */
export const CHAIN_ID_TO_NAME: Record<number, SupportedChain> = {
  [mainnet.id]: "ethereum",
  [base.id]: "base",
  [optimism.id]: "optimism",
  [arbitrum.id]: "arbitrum",
  [polygon.id]: "polygon",
  [bsc.id]: "bsc",
  [avalanche.id]: "avalanche",
};

/**
 * Chain name to chain ID mapping
 */
export const CHAIN_NAME_TO_ID: Record<SupportedChain, number> = {
  ethereum: mainnet.id,
  base: base.id,
  optimism: optimism.id,
  arbitrum: arbitrum.id,
  polygon: polygon.id,
  bsc: bsc.id,
  avalanche: avalanche.id,
};

/**
 * Wagmi chain objects mapped by chain name
 */
export const WAGMI_CHAINS: Record<SupportedChain, Chain> = {
  ethereum: mainnet,
  base: base,
  optimism: optimism,
  arbitrum: arbitrum,
  polygon: polygon,
  bsc: bsc,
  avalanche: avalanche,
};

/**
 * Validate if a chain ID is supported
 */
export function isChainIdSupported(chainId: number): boolean {
  return chainId in CHAIN_ID_TO_NAME;
}

/**
 * Validate if a chain name is supported
 */
export function isChainNameSupported(chainName: string): chainName is SupportedChain {
  return SUPPORTED_CHAINS.includes(chainName.toLowerCase() as SupportedChain);
}

/**
 * Get chain metadata by chain ID
 */
export function getChainById(chainId: number): ChainMetadata | undefined {
  const chainName = CHAIN_ID_TO_NAME[chainId];
  return chainName ? CHAIN_CONFIG[chainName] : undefined;
}

/**
 * Get chain metadata by chain name
 */
export function getChainByName(chainName: string): ChainMetadata | undefined {
  const normalizedName = chainName.toLowerCase() as SupportedChain;
  return CHAIN_CONFIG[normalizedName];
}

/**
 * Get chain ID from chain name
 */
export function getChainId(chainName: string): number | undefined {
  const normalizedName = chainName.toLowerCase() as SupportedChain;
  return CHAIN_NAME_TO_ID[normalizedName];
}

/**
 * Get chain name from chain ID
 */
export function getChainName(chainId: number): SupportedChain | undefined {
  return CHAIN_ID_TO_NAME[chainId];
}

/**
 * Get block explorer URL for a transaction
 */
export function getTransactionExplorerUrl(chainName: string, txHash: string): string {
  const chain = getChainByName(chainName);
  if (!chain) return `https://etherscan.io/tx/${txHash}`;
  return `${chain.blockExplorer}/tx/${txHash}`;
}

/**
 * Get block explorer URL for an address
 */
export function getAddressExplorerUrl(chainName: string, address: string): string {
  const chain = getChainByName(chainName);
  if (!chain) return `https://etherscan.io/address/${address}`;
  return `${chain.blockExplorer}/address/${address}`;
}

/**
 * Get block explorer URL for a token
 */
export function getTokenExplorerUrl(chainName: string, tokenAddress: string): string {
  const chain = getChainByName(chainName);
  if (!chain) return `https://etherscan.io/token/${tokenAddress}`;
  return `${chain.blockExplorer}/token/${tokenAddress}`;
}

/**
 * Token availability scoring for intelligent chain selection
 * Higher score = more commonly used/liquid
 */
const TOKEN_PRIORITY: Record<string, number> = {
  ETH: 100,
  USDC: 95,
  USDT: 90,
  DAI: 85,
  WETH: 80,
  WBTC: 75,
  LINK: 70,
  UNI: 65,
  AAVE: 60,
  // Native tokens for non-ETH chains
  MATIC: 100,
  BNB: 100,
  AVAX: 100,
  OP: 80,
  ARB: 80,
};

/**
 * Chain priority for default selection (based on liquidity and usage)
 */
const CHAIN_PRIORITY: Record<SupportedChain, number> = {
  ethereum: 100,
  arbitrum: 90,
  base: 85,
  optimism: 80,
  polygon: 75,
  bsc: 70,
  avalanche: 65,
};

/**
 * Intelligent default chain selection based on token availability and user preferences
 * 
 * Algorithm:
 * 1. Find all chains that support the requested token(s)
 * 2. Score each chain based on token priority and chain priority
 * 3. Return the highest scoring chain
 * 
 * Requirements: 8.6
 */
export function selectBestChainForToken(token: string): SupportedChain {
  const upperToken = token.toUpperCase();
  
  // Find chains that support this token
  const supportingChains = SUPPORTED_CHAINS.filter(
    (chain) => TOKEN_WHITELIST[chain].includes(upperToken)
  );
  
  if (supportingChains.length === 0) {
    // Default to Ethereum if token not found
    return "ethereum";
  }
  
  if (supportingChains.length === 1) {
    return supportingChains[0];
  }
  
  // Score each chain
  const chainScores = supportingChains.map((chain) => {
    const chainPriority = CHAIN_PRIORITY[chain];
    const tokenPriority = TOKEN_PRIORITY[upperToken] || 50;
    
    // Bonus for native token on its chain
    const nativeBonus = isNativeToken(upperToken, chain) ? 20 : 0;
    
    return {
      chain,
      score: chainPriority + tokenPriority + nativeBonus,
    };
  });
  
  // Sort by score descending and return the best chain
  chainScores.sort((a, b) => b.score - a.score);
  return chainScores[0].chain;
}

/**
 * Select best chain for a token pair (swap operation)
 * Finds chains that support both tokens and returns the best one
 * 
 * Requirements: 8.6
 */
export function selectBestChainForSwap(
  tokenIn: string,
  tokenOut: string
): SupportedChain | null {
  const upperTokenIn = tokenIn.toUpperCase();
  const upperTokenOut = tokenOut.toUpperCase();
  
  // Find chains that support both tokens
  const supportingChains = SUPPORTED_CHAINS.filter(
    (chain) =>
      TOKEN_WHITELIST[chain].includes(upperTokenIn) &&
      TOKEN_WHITELIST[chain].includes(upperTokenOut)
  );
  
  if (supportingChains.length === 0) {
    return null;
  }
  
  if (supportingChains.length === 1) {
    return supportingChains[0];
  }
  
  // Score each chain based on both tokens
  const chainScores = supportingChains.map((chain) => {
    const chainPriority = CHAIN_PRIORITY[chain];
    const tokenInPriority = TOKEN_PRIORITY[upperTokenIn] || 50;
    const tokenOutPriority = TOKEN_PRIORITY[upperTokenOut] || 50;
    
    // Bonus for native tokens
    const nativeBonus =
      (isNativeToken(upperTokenIn, chain) ? 10 : 0) +
      (isNativeToken(upperTokenOut, chain) ? 10 : 0);
    
    return {
      chain,
      score: chainPriority + (tokenInPriority + tokenOutPriority) / 2 + nativeBonus,
    };
  });
  
  chainScores.sort((a, b) => b.score - a.score);
  return chainScores[0].chain;
}

/**
 * Native token symbols per chain
 */
export const NATIVE_TOKENS: Record<SupportedChain, string> = {
  ethereum: "ETH",
  base: "ETH",
  optimism: "ETH",
  arbitrum: "ETH",
  polygon: "MATIC",
  bsc: "BNB",
  avalanche: "AVAX",
};

/**
 * Check if a token is the native token for a chain
 */
export function isNativeToken(token: string, chain: SupportedChain): boolean {
  return NATIVE_TOKENS[chain] === token.toUpperCase();
}

/**
 * Get the native token for a chain
 */
export function getNativeToken(chain: SupportedChain): string {
  return NATIVE_TOKENS[chain];
}

/**
 * Validate token on a specific chain
 * Returns validation result with helpful error message
 * 
 * Requirements: 8.2
 */
export interface TokenValidationResult {
  valid: boolean;
  token: string;
  chain: SupportedChain;
  error?: string;
  suggestions?: SupportedChain[];
}

export function validateTokenOnChain(
  token: string,
  chain: string
): TokenValidationResult {
  const upperToken = token.toUpperCase();
  const normalizedChain = chain.toLowerCase() as SupportedChain;
  
  // Check if chain is supported
  if (!isChainNameSupported(normalizedChain)) {
    return {
      valid: false,
      token: upperToken,
      chain: normalizedChain,
      error: `Chain "${chain}" is not supported. Supported chains: ${SUPPORTED_CHAINS.join(", ")}`,
    };
  }
  
  // Check if token is supported on chain
  const chainTokens = TOKEN_WHITELIST[normalizedChain];
  if (!chainTokens.includes(upperToken)) {
    // Find alternative chains that support this token
    const alternativeChains = SUPPORTED_CHAINS.filter(
      (c) => TOKEN_WHITELIST[c].includes(upperToken)
    );
    
    return {
      valid: false,
      token: upperToken,
      chain: normalizedChain,
      error: `Token "${upperToken}" is not supported on ${CHAIN_CONFIG[normalizedChain].name}`,
      suggestions: alternativeChains.length > 0 ? alternativeChains : undefined,
    };
  }
  
  return {
    valid: true,
    token: upperToken,
    chain: normalizedChain,
  };
}

/**
 * Check if network switching is required
 */
export function requiresNetworkSwitch(
  currentChainId: number,
  targetChain: string
): boolean {
  const targetChainId = getChainId(targetChain);
  if (!targetChainId) return false;
  return currentChainId !== targetChainId;
}

/**
 * Get all supported chains as an array of metadata
 */
export function getAllChains(): ChainMetadata[] {
  return SUPPORTED_CHAINS.map((chain) => CHAIN_CONFIG[chain]);
}

/**
 * Get chains that support a specific token
 */
export function getChainsForToken(token: string): ChainMetadata[] {
  const upperToken = token.toUpperCase();
  return SUPPORTED_CHAINS.filter((chain) =>
    TOKEN_WHITELIST[chain].includes(upperToken)
  ).map((chain) => CHAIN_CONFIG[chain]);
}

/**
 * Get all tokens supported on a specific chain
 */
export function getTokensForChain(chain: string): string[] {
  const normalizedChain = chain.toLowerCase() as SupportedChain;
  return TOKEN_WHITELIST[normalizedChain] || [];
}

/**
 * Transaction history entry type
 */
export interface TransactionHistoryEntry {
  hash: string;
  chainId: number;
  chainName: SupportedChain;
  timestamp: number;
  type: "swap" | "transfer" | "approval" | "other";
  status: "pending" | "confirmed" | "failed";
  tokenIn?: string;
  tokenOut?: string;
  amount?: string;
}

/**
 * Chain-specific transaction history storage key
 */
export function getTransactionHistoryKey(chainId: number): string {
  return `defi-tx-history-${chainId}`;
}

/**
 * Format chain display name with optional short form
 */
export function formatChainName(chain: string, short = false): string {
  const metadata = getChainByName(chain);
  if (!metadata) return chain;
  return short ? metadata.shortName : metadata.name;
}


/**
 * Safe chain ID lookup from chain name string
 * Returns the chain ID or a default value
 */
export function getChainIdSafe(chainName: string, defaultId = 1): number {
  const normalizedName = chainName.toLowerCase() as SupportedChain;
  return CHAIN_NAME_TO_ID[normalizedName] ?? defaultId;
}

/**
 * Safe native token lookup from chain name string
 * Returns the native token symbol or a default value
 */
export function getNativeTokenSafe(chainName: string, defaultToken = "ETH"): string {
  const normalizedName = chainName.toLowerCase() as SupportedChain;
  return NATIVE_TOKENS[normalizedName] ?? defaultToken;
}

/**
 * Check if a token is native for a given chain (string-safe version)
 */
export function isNativeTokenSafe(token: string, chainName: string): boolean {
  const nativeToken = getNativeTokenSafe(chainName);
  return nativeToken.toUpperCase() === token.toUpperCase();
}
