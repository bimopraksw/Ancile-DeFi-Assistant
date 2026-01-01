import { z } from "zod";

/**
 * Supported EVM chain names for validation.
 * Must match the chains configured in wagmi.ts
 */
export const SUPPORTED_CHAINS = [
  "ethereum",
  "base",
  "optimism",
  "arbitrum",
  "polygon",
  "bsc",
  "avalanche",
] as const;

export type SupportedChain = (typeof SUPPORTED_CHAINS)[number];

/**
 * Token whitelist for supported EVM chains.
 * Maps chain names to arrays of valid token symbols (all uppercase for consistent comparison).
 */
export const TOKEN_WHITELIST: Record<SupportedChain, string[]> = {
  ethereum: ["ETH", "USDC", "USDT", "DAI", "WETH", "WBTC", "LINK", "UNI", "AAVE", "CRV", "MKR", "SNX", "COMP", "YFI", "SUSHI"],
  base: ["ETH", "USDC", "USDBC", "DAI", "WETH", "CBETH", "AERO", "BRETT", "DEGEN"],
  optimism: ["ETH", "USDC", "USDT", "DAI", "WETH", "OP", "SNX", "VELO", "SUSD"],
  arbitrum: ["ETH", "USDC", "USDT", "DAI", "WETH", "ARB", "GMX", "MAGIC", "RDNT", "GNS"],
  polygon: ["MATIC", "USDC", "USDT", "DAI", "WETH", "WMATIC", "AAVE", "LINK", "CRV", "BAL", "QUICK"],
  bsc: ["BNB", "USDC", "USDT", "BUSD", "DAI", "WBNB", "CAKE", "XVS", "BAKE", "ALPACA"],
  avalanche: ["AVAX", "USDC", "USDT", "DAI", "WAVAX", "JOE", "PNG", "QI", "GMX"],
};

/**
 * Get all unique tokens across all chains.
 */
export function getAllSupportedTokens(): string[] {
  const allTokens = new Set<string>();
  for (const tokens of Object.values(TOKEN_WHITELIST)) {
    tokens.forEach((token) => allTokens.add(token));
  }
  return Array.from(allTokens);
}

/**
 * Check if a token is supported on a specific chain.
 */
export function isTokenSupportedOnChain(token: string, chain: SupportedChain): boolean {
  const chainTokens = TOKEN_WHITELIST[chain];
  return chainTokens?.includes(token.toUpperCase()) ?? false;
}

/**
 * Find chains that support a given token.
 */
export function getChainsForToken(token: string): SupportedChain[] {
  const upperToken = token.toUpperCase();
  return SUPPORTED_CHAINS.filter((chain) => 
    TOKEN_WHITELIST[chain].includes(upperToken)
  );
}

/**
 * Get the native token symbol for a chain.
 */
export function getNativeTokenForChain(chain: SupportedChain): string {
  const nativeTokens: Record<SupportedChain, string> = {
    ethereum: "ETH",
    base: "ETH",
    optimism: "ETH",
    arbitrum: "ETH",
    polygon: "MATIC",
    bsc: "BNB",
    avalanche: "AVAX",
  };
  return nativeTokens[chain];
}

/**
 * Check if a token is the native token for a given chain.
 */
export function isNativeTokenOnChain(token: string, chain: SupportedChain): boolean {
  return getNativeTokenForChain(chain) === token.toUpperCase();
}


/**
 * Zod schema for chain validation.
 * Validates that the chain is one of the supported EVM networks.
 */
export const chainSchema = z.enum(SUPPORTED_CHAINS, {
  error: `Chain must be one of: ${SUPPORTED_CHAINS.join(", ")}`,
});

/**
 * Zod schema for token symbol validation.
 * Validates that the token is in the global whitelist.
 */
export const tokenSchema = z.string().min(1).max(10).refine(
  (token) => getAllSupportedTokens().includes(token.toUpperCase()),
  {
    message: "Token not found in supported token whitelist",
  }
);

/**
 * Zod schema for swap tool parameters.
 * Validates tokenIn, tokenOut, amount, and chain with comprehensive validation.
 * 
 * Requirements: 2.3, 1.4, 8.2
 */
export const SwapToolParamsSchema = z.object({
  tokenIn: z.string().min(1).max(10).describe("The token symbol to sell (e.g., 'ETH', 'USDC')"),
  tokenOut: z.string().min(1).max(10).describe("The token symbol to buy (e.g., 'USDC', 'ETH')"),
  amount: z.number().positive().describe("The amount of tokenIn to swap"),
  chain: chainSchema.describe("The blockchain network to execute the swap on"),
}).refine(
  (data) => data.tokenIn.toUpperCase() !== data.tokenOut.toUpperCase(),
  {
    message: "tokenIn and tokenOut must be different tokens",
    path: ["tokenOut"],
  }
).refine(
  (data) => isTokenSupportedOnChain(data.tokenIn, data.chain),
  {
    message: "tokenIn is not supported on the specified chain",
    path: ["tokenIn"],
  }
).refine(
  (data) => isTokenSupportedOnChain(data.tokenOut, data.chain),
  {
    message: "tokenOut is not supported on the specified chain",
    path: ["tokenOut"],
  }
);

/**
 * Zod schema for balance check tool parameters.
 * Validates token and chain with whitelist validation.
 * 
 * Requirements: 2.3, 1.4, 8.2
 */
export const BalanceToolParamsSchema = z.object({
  token: z.string().min(1).max(10).describe("The token symbol to check balance for (e.g., 'ETH', 'USDC')"),
  chain: chainSchema.describe("The blockchain network to check the balance on"),
}).refine(
  (data) => isTokenSupportedOnChain(data.token, data.chain),
  {
    message: "Token is not supported on the specified chain",
    path: ["token"],
  }
);

/**
 * Type definitions derived from Zod schemas.
 */
export type SwapToolParams = z.infer<typeof SwapToolParamsSchema>;
export type BalanceToolParams = z.infer<typeof BalanceToolParamsSchema>;

/**
 * Validation result type for tool parameters.
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validate swap parameters with detailed error messages.
 */
export function validateSwapParams(params: unknown): ValidationResult<SwapToolParams> {
  const result = SwapToolParamsSchema.safeParse(params);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error.issues.map((e) => e.message).join("; "),
  };
}

/**
 * Validate balance parameters with detailed error messages.
 */
export function validateBalanceParams(params: unknown): ValidationResult<BalanceToolParams> {
  const result = BalanceToolParamsSchema.safeParse(params);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error.issues.map((e) => e.message).join("; "),
  };
}
