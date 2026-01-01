/**
 * Property-Based Tests for Intent Recognition and Parsing
 * 
 * Feature: defi-intent-interface, Property 1: Intent Recognition and Parsing
 * Validates: Requirements 1.1, 1.2, 1.4, 1.5
 * 
 * Tests that the Intent_System correctly identifies operation types and extracts
 * all required parameters with proper validation against supported token and chain whitelists.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  SUPPORTED_CHAINS,
  TOKEN_WHITELIST,
  isTokenSupportedOnChain,
  getChainsForToken,
  getAllSupportedTokens,
  SwapToolParamsSchema,
  BalanceToolParamsSchema,
  validateSwapParams,
  validateBalanceParams,
  type SupportedChain,
} from "@/lib/schemas";

describe("Property 1: Intent Recognition and Parsing", () => {
  /**
   * Property: For any valid token from the whitelist and any supported chain where
   * that token exists, the validation should succeed.
   */
  it("should validate tokens that exist on their specified chains", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SUPPORTED_CHAINS),
        (chain) => {
          const chainTokens = TOKEN_WHITELIST[chain];
          // For each token on this chain, validation should pass
          chainTokens.forEach((token) => {
            expect(isTokenSupportedOnChain(token, chain)).toBe(true);
            expect(isTokenSupportedOnChain(token.toLowerCase(), chain)).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any token, getChainsForToken should return only chains
   * where that token is actually in the whitelist.
   */
  it("should return correct chains for any supported token", () => {
    const allTokens = getAllSupportedTokens();
    
    fc.assert(
      fc.property(
        fc.constantFrom(...allTokens),
        (token) => {
          const chains = getChainsForToken(token);
          
          // Each returned chain should actually support the token
          chains.forEach((chain) => {
            expect(TOKEN_WHITELIST[chain]).toContain(token.toUpperCase());
          });
          
          // No chain not in the result should support the token
          SUPPORTED_CHAINS.forEach((chain) => {
            if (!chains.includes(chain)) {
              expect(TOKEN_WHITELIST[chain]).not.toContain(token.toUpperCase());
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });


  /**
   * Property: For any valid swap parameters (valid tokens on valid chain),
   * the SwapToolParamsSchema should successfully validate.
   */
  it("should validate any valid swap parameters", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SUPPORTED_CHAINS),
        fc.integer({ min: 1, max: 1000000 }),
        (chain, amount) => {
          const chainTokens = TOKEN_WHITELIST[chain];
          if (chainTokens.length < 2) return; // Need at least 2 tokens to swap
          
          const tokenIn = chainTokens[0];
          const tokenOut = chainTokens[1];
          
          const params = { tokenIn, tokenOut, amount, chain };
          const result = SwapToolParamsSchema.safeParse(params);
          
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.tokenIn).toBe(tokenIn);
            expect(result.data.tokenOut).toBe(tokenOut);
            expect(result.data.amount).toBe(amount);
            expect(result.data.chain).toBe(chain);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any valid balance check parameters (valid token on valid chain),
   * the BalanceToolParamsSchema should successfully validate.
   */
  it("should validate any valid balance check parameters", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SUPPORTED_CHAINS),
        (chain) => {
          const chainTokens = TOKEN_WHITELIST[chain];
          const token = chainTokens[0];
          
          const params = { token, chain };
          const result = BalanceToolParamsSchema.safeParse(params);
          
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.token).toBe(token);
            expect(result.data.chain).toBe(chain);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Swapping a token for itself should always fail validation.
   */
  it("should reject swap when tokenIn equals tokenOut", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SUPPORTED_CHAINS),
        fc.integer({ min: 1, max: 1000000 }),
        (chain, amount) => {
          const chainTokens = TOKEN_WHITELIST[chain];
          const token = chainTokens[0];
          
          const params = { tokenIn: token, tokenOut: token, amount, chain };
          const result = SwapToolParamsSchema.safeParse(params);
          
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Invalid chain names should always fail validation.
   */
  it("should reject invalid chain names", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !SUPPORTED_CHAINS.includes(s as SupportedChain)),
        (invalidChain) => {
          const params = { token: "ETH", chain: invalidChain };
          const result = BalanceToolParamsSchema.safeParse(params);
          
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Tokens not in the whitelist should fail validation for balance checks.
   */
  it("should reject tokens not in the whitelist", () => {
    const allTokens = getAllSupportedTokens();
    
    fc.assert(
      fc.property(
        fc.constantFrom(...SUPPORTED_CHAINS),
        fc.string({ minLength: 1, maxLength: 10 }).filter(
          (s) => !allTokens.includes(s.toUpperCase()) && s.trim().length > 0
        ),
        (chain, invalidToken) => {
          const params = { token: invalidToken, chain };
          const result = BalanceToolParamsSchema.safeParse(params);
          
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Negative or zero amounts should fail swap validation.
   */
  it("should reject non-positive amounts for swaps", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SUPPORTED_CHAINS),
        fc.integer({ max: 0 }),
        (chain, invalidAmount) => {
          const chainTokens = TOKEN_WHITELIST[chain];
          if (chainTokens.length < 2) return;
          
          const params = {
            tokenIn: chainTokens[0],
            tokenOut: chainTokens[1],
            amount: invalidAmount,
            chain,
          };
          const result = SwapToolParamsSchema.safeParse(params);
          
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: validateSwapParams helper should return consistent results with schema.
   */
  it("should have validateSwapParams consistent with schema validation", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SUPPORTED_CHAINS),
        fc.integer({ min: 1, max: 1000000 }),
        (chain, amount) => {
          const chainTokens = TOKEN_WHITELIST[chain];
          if (chainTokens.length < 2) return;
          
          const params = {
            tokenIn: chainTokens[0],
            tokenOut: chainTokens[1],
            amount,
            chain,
          };
          
          const schemaResult = SwapToolParamsSchema.safeParse(params);
          const helperResult = validateSwapParams(params);
          
          expect(helperResult.success).toBe(schemaResult.success);
          if (helperResult.success && schemaResult.success) {
            expect(helperResult.data).toEqual(schemaResult.data);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: validateBalanceParams helper should return consistent results with schema.
   */
  it("should have validateBalanceParams consistent with schema validation", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SUPPORTED_CHAINS),
        (chain) => {
          const chainTokens = TOKEN_WHITELIST[chain];
          const params = { token: chainTokens[0], chain };
          
          const schemaResult = BalanceToolParamsSchema.safeParse(params);
          const helperResult = validateBalanceParams(params);
          
          expect(helperResult.success).toBe(schemaResult.success);
          if (helperResult.success && schemaResult.success) {
            expect(helperResult.data).toEqual(schemaResult.data);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
