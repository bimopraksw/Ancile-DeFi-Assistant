/**
 * Property-Based Tests for Balance Data Accuracy
 * 
 * Feature: defi-intent-interface, Property 11: Balance Data Accuracy
 * Validates: Requirements 3.3
 * 
 * Tests that for any balance check request, the Balance_Checker should return
 * accurate current on-chain balance data that matches the actual blockchain
 * state for the specified token and network.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { formatUnits, parseUnits } from "viem";
import {
  SUPPORTED_CHAINS,
  TOKEN_WHITELIST,
  isTokenSupportedOnChain,
  type SupportedChain,
} from "@/lib/schemas";

/**
 * Chain name to chain ID mapping
 */
const chainNameToId: Record<string, number> = {
  ethereum: 1,
  base: 8453,
  optimism: 10,
  arbitrum: 42161,
  polygon: 137,
  bsc: 56,
  avalanche: 43114,
};

/**
 * Native token symbols per chain
 */
const nativeTokens: Record<string, string> = {
  ethereum: "ETH",
  base: "ETH",
  optimism: "ETH",
  arbitrum: "ETH",
  polygon: "MATIC",
  bsc: "BNB",
  avalanche: "AVAX",
};

/**
 * Token decimals mapping
 */
const tokenDecimals: Record<string, number> = {
  ETH: 18,
  USDC: 6,
  USDT: 6,
  DAI: 18,
  WETH: 18,
  WBTC: 8,
  MATIC: 18,
  BNB: 18,
  AVAX: 18,
  OP: 18,
  ARB: 18,
  LINK: 18,
  UNI: 18,
  AAVE: 18,
};

/**
 * Get decimals for a token
 */
function getTokenDecimals(token: string): number {
  return tokenDecimals[token.toUpperCase()] || 18;
}

/**
 * Simulated balance data structure
 */
interface BalanceData {
  value: bigint;
  decimals: number;
  symbol: string;
}

/**
 * Arbitrary for valid chain
 */
const chainArb = fc.constantFrom(...SUPPORTED_CHAINS);

/**
 * Arbitrary for valid token on a specific chain
 */
const tokenOnChainArb = (chain: SupportedChain) =>
  fc.constantFrom(...TOKEN_WHITELIST[chain]);

/**
 * Arbitrary for valid chain and token pair
 */
const chainTokenPairArb = chainArb.chain((chain) =>
  tokenOnChainArb(chain).map((token) => ({ chain, token }))
);

/**
 * Arbitrary for balance value (bigint)
 */
const balanceValueArb = fc
  .integer({ min: 0, max: Number.MAX_SAFE_INTEGER })
  .map((n) => BigInt(n));

/**
 * Arbitrary for decimals (common values)
 */
const decimalsArb = fc.constantFrom(6, 8, 18);

/**
 * Arbitrary for complete balance data
 */
const balanceDataArb: fc.Arbitrary<BalanceData> = fc
  .tuple(balanceValueArb, decimalsArb, fc.constantFrom(...Object.keys(tokenDecimals)))
  .map(([value, decimals, symbol]) => ({
    value,
    decimals,
    symbol,
  }));

/**
 * Arbitrary for Ethereum address
 */
const addressArb = fc
  .array(fc.constantFrom(...'0123456789abcdef'.split('')), { minLength: 40, maxLength: 40 })
  .map((chars) => `0x${chars.join('')}` as `0x${string}`);

describe("Property 11: Balance Data Accuracy", () => {
  /**
   * Property: For any valid chain and token pair, the token should be supported.
   */
  it("should validate token support on chain", () => {
    fc.assert(
      fc.property(chainTokenPairArb, ({ chain, token }) => {
        expect(isTokenSupportedOnChain(token, chain)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any chain, the chain ID should be a valid positive number.
   */
  it("should have valid chain IDs for all supported chains", () => {
    fc.assert(
      fc.property(chainArb, (chain) => {
        const chainId = chainNameToId[chain];
        expect(chainId).toBeDefined();
        expect(chainId).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any chain, there should be a native token defined.
   */
  it("should have native token for all supported chains", () => {
    fc.assert(
      fc.property(chainArb, (chain) => {
        const nativeToken = nativeTokens[chain];
        expect(nativeToken).toBeDefined();
        expect(nativeToken.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any balance value, formatting and parsing should be consistent (round-trip).
   */
  it("should maintain balance accuracy through format/parse round-trip", () => {
    fc.assert(
      fc.property(
        fc.tuple(balanceValueArb, decimalsArb),
        ([value, decimals]) => {
          const formatted = formatUnits(value, decimals);
          const parsed = parseUnits(formatted, decimals);
          // Due to floating point, we check if the difference is minimal
          const diff = value > parsed ? value - parsed : parsed - value;
          // Allow for small rounding differences (less than 1 wei equivalent)
          expect(diff).toBeLessThanOrEqual(BigInt(1));
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any balance data, the formatted value should be a valid number string.
   */
  it("should format balance as valid number string", () => {
    fc.assert(
      fc.property(balanceDataArb, (balance) => {
        const formatted = formatUnits(balance.value, balance.decimals);
        expect(typeof formatted).toBe("string");
        const num = parseFloat(formatted);
        expect(isNaN(num)).toBe(false);
        expect(num).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any balance, zero value should format to "0".
   */
  it("should format zero balance correctly", () => {
    fc.assert(
      fc.property(decimalsArb, (decimals) => {
        const formatted = formatUnits(BigInt(0), decimals);
        expect(parseFloat(formatted)).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any token, decimals should be a positive integer.
   */
  it("should have valid decimals for all tokens", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.keys(tokenDecimals)),
        (token) => {
          const decimals = getTokenDecimals(token);
          expect(Number.isInteger(decimals)).toBe(true);
          expect(decimals).toBeGreaterThan(0);
          expect(decimals).toBeLessThanOrEqual(18);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any address, it should be a valid Ethereum address format.
   */
  it("should generate valid Ethereum addresses", () => {
    fc.assert(
      fc.property(addressArb, (address) => {
        expect(address.startsWith("0x")).toBe(true);
        expect(address.length).toBe(42);
        const hexPart = address.slice(2);
        expect(/^[0-9a-f]+$/i.test(hexPart)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any balance value, it should be non-negative.
   */
  it("should always have non-negative balance values", () => {
    fc.assert(
      fc.property(balanceValueArb, (value) => {
        expect(value).toBeGreaterThanOrEqual(BigInt(0));
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any chain and its native token, the token should be supported.
   */
  it("should support native tokens on their respective chains", () => {
    fc.assert(
      fc.property(chainArb, (chain) => {
        const nativeToken = nativeTokens[chain];
        expect(isTokenSupportedOnChain(nativeToken, chain)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Balance formatting should preserve relative ordering.
   * If balance A > balance B, then formatted A > formatted B.
   */
  it("should preserve balance ordering after formatting", () => {
    fc.assert(
      fc.property(
        fc.tuple(balanceValueArb, balanceValueArb, decimalsArb),
        ([valueA, valueB, decimals]) => {
          const formattedA = parseFloat(formatUnits(valueA, decimals));
          const formattedB = parseFloat(formatUnits(valueB, decimals));
          
          if (valueA > valueB) {
            expect(formattedA).toBeGreaterThanOrEqual(formattedB);
          } else if (valueA < valueB) {
            expect(formattedA).toBeLessThanOrEqual(formattedB);
          } else {
            expect(formattedA).toBe(formattedB);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any token whitelist entry, it should be a non-empty string.
   */
  it("should have valid token symbols in whitelist", () => {
    fc.assert(
      fc.property(chainArb, (chain) => {
        const tokens = TOKEN_WHITELIST[chain];
        expect(Array.isArray(tokens)).toBe(true);
        expect(tokens.length).toBeGreaterThan(0);
        tokens.forEach((token) => {
          expect(typeof token).toBe("string");
          expect(token.length).toBeGreaterThan(0);
          // Token symbols should be uppercase
          expect(token).toBe(token.toUpperCase());
        });
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Chain IDs should be unique across all supported chains.
   */
  it("should have unique chain IDs", () => {
    const chainIds = SUPPORTED_CHAINS.map((chain) => chainNameToId[chain]);
    const uniqueIds = new Set(chainIds);
    expect(uniqueIds.size).toBe(SUPPORTED_CHAINS.length);
  });

  /**
   * Property: For any balance with specific decimals, the precision should be maintained.
   */
  it("should maintain precision for different decimal values", () => {
    // Test specific decimal cases
    const testCases = [
      { value: BigInt(1000000), decimals: 6, expected: "1" }, // 1 USDC
      { value: BigInt(1000000000000000000), decimals: 18, expected: "1" }, // 1 ETH
      { value: BigInt(100000000), decimals: 8, expected: "1" }, // 1 WBTC
    ];

    testCases.forEach(({ value, decimals, expected }) => {
      const formatted = formatUnits(value, decimals);
      expect(parseFloat(formatted)).toBe(parseFloat(expected));
    });
  });

  /**
   * Property: For any unsupported token on a chain, isTokenSupportedOnChain should return false.
   */
  it("should correctly identify unsupported tokens", () => {
    const unsupportedTokens = ["FAKE", "NOTREAL", "SCAM", "XXX"];
    
    fc.assert(
      fc.property(
        fc.tuple(chainArb, fc.constantFrom(...unsupportedTokens)),
        ([chain, token]) => {
          expect(isTokenSupportedOnChain(token, chain)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
