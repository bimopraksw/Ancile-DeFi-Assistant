/**
 * Property-Based Tests for Multi-Chain Network Management
 * 
 * Feature: defi-intent-interface, Property 9: Multi-Chain Network Management
 * Validates: Requirements 8.2, 8.3, 8.4, 8.5, 8.6
 * 
 * Tests that the system correctly validates chains, handles network switching,
 * maintains separate transaction histories, and intelligently suggests networks.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  CHAIN_CONFIG,
  CHAIN_ID_TO_NAME,
  CHAIN_NAME_TO_ID,
  isChainIdSupported,
  isChainNameSupported,
  getChainById,
  getChainByName,
  getChainId,
  getChainName,
  selectBestChainForToken,
  selectBestChainForSwap,
  validateTokenOnChain,
  requiresNetworkSwitch,
  getTransactionExplorerUrl,
  getAddressExplorerUrl,
  getAllChains,
  getChainsForToken,
  getTokensForChain,
  getTransactionHistoryKey,
  formatChainName,
  isNativeToken,
  getNativeToken,
} from "@/lib/chains";
import { SUPPORTED_CHAINS, TOKEN_WHITELIST, type SupportedChain } from "@/lib/schemas";

describe("Property 9: Multi-Chain Network Management", () => {
  /**
   * Property: For any supported chain name, the system should validate it correctly
   * and return consistent chain metadata.
   * 
   * Validates: Requirements 8.2
   */
  it("should validate all supported chain names consistently", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SUPPORTED_CHAINS),
        (chainName) => {
          // Chain name should be recognized as supported
          expect(isChainNameSupported(chainName)).toBe(true);
          
          // Should have valid chain config
          const config = getChainByName(chainName);
          expect(config).toBeDefined();
          expect(config!.id).toBeGreaterThan(0);
          expect(config!.name).toBeTruthy();
          expect(config!.blockExplorer).toMatch(/^https?:\/\//);
          
          // Chain ID lookup should be consistent
          const chainId = getChainId(chainName);
          expect(chainId).toBe(config!.id);
          
          // Reverse lookup should return the same chain name
          const reverseName = getChainName(chainId!);
          expect(reverseName).toBe(chainName);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any supported chain ID, the system should return valid metadata
   * and maintain bidirectional mapping consistency.
   * 
   * Validates: Requirements 8.2
   */
  it("should maintain consistent chain ID to name mappings", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.keys(CHAIN_ID_TO_NAME).map(Number)),
        (chainId) => {
          // Chain ID should be recognized as supported
          expect(isChainIdSupported(chainId)).toBe(true);
          
          // Should have valid chain config
          const config = getChainById(chainId);
          expect(config).toBeDefined();
          expect(config!.name).toBeTruthy();
          
          // Name lookup should return the same chain ID
          const chainName = getChainName(chainId);
          expect(chainName).toBeDefined();
          const reversedId = getChainId(chainName!);
          expect(reversedId).toBe(chainId);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any unsupported chain name, the system should correctly
   * identify it as unsupported.
   * 
   * Validates: Requirements 8.2
   */
  it("should reject unsupported chain names", () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !SUPPORTED_CHAINS.includes(s.toLowerCase() as SupportedChain)),
        (invalidChainName) => {
          // Should not be recognized as supported
          expect(isChainNameSupported(invalidChainName)).toBe(false);
          
          // Should return undefined for chain config
          const config = getChainByName(invalidChainName);
          expect(config).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any token and chain combination, validation should return
   * consistent results with helpful suggestions when invalid.
   * 
   * Validates: Requirements 8.2, 8.6
   */
  it("should validate tokens on chains with helpful suggestions", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SUPPORTED_CHAINS),
        fc.constantFrom(...Object.values(TOKEN_WHITELIST).flat()),
        (chain, token) => {
          const result = validateTokenOnChain(token, chain);
          
          // Result should always have required fields
          expect(result.token).toBe(token.toUpperCase());
          expect(result.chain).toBe(chain);
          
          // If valid, no error or suggestions
          if (result.valid) {
            expect(result.error).toBeUndefined();
          }
          
          // If invalid, should have error message
          if (!result.valid) {
            expect(result.error).toBeTruthy();
            // If token exists on other chains, should have suggestions
            const otherChains = SUPPORTED_CHAINS.filter(
              (c) => c !== chain && TOKEN_WHITELIST[c].includes(token.toUpperCase())
            );
            if (otherChains.length > 0) {
              expect(result.suggestions).toBeDefined();
              expect(result.suggestions!.length).toBeGreaterThan(0);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any token, selectBestChainForToken should return a chain
   * that actually supports that token.
   * 
   * Validates: Requirements 8.6
   */
  it("should select appropriate chains for tokens", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(TOKEN_WHITELIST).flat()),
        (token) => {
          const selectedChain = selectBestChainForToken(token);
          
          // Selected chain should be a supported chain
          expect(SUPPORTED_CHAINS).toContain(selectedChain);
          
          // Token should be supported on the selected chain
          const chainTokens = TOKEN_WHITELIST[selectedChain];
          expect(chainTokens).toContain(token.toUpperCase());
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any valid token pair, selectBestChainForSwap should return
   * a chain that supports both tokens, or null if no such chain exists.
   * 
   * Validates: Requirements 8.6
   */
  it("should select appropriate chains for token swaps", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SUPPORTED_CHAINS),
        (chain) => {
          const tokens = TOKEN_WHITELIST[chain];
          if (tokens.length < 2) return; // Skip chains with less than 2 tokens
          
          // Pick two different tokens from the same chain
          const tokenIn = tokens[0];
          const tokenOut = tokens[1];
          
          const selectedChain = selectBestChainForSwap(tokenIn, tokenOut);
          
          // Should return a valid chain
          expect(selectedChain).not.toBeNull();
          expect(SUPPORTED_CHAINS).toContain(selectedChain);
          
          // Both tokens should be supported on the selected chain
          const selectedChainTokens = TOKEN_WHITELIST[selectedChain!];
          expect(selectedChainTokens).toContain(tokenIn.toUpperCase());
          expect(selectedChainTokens).toContain(tokenOut.toUpperCase());
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Network switching should be required when current chain ID
   * differs from target chain ID.
   * 
   * Validates: Requirements 8.3
   */
  it("should correctly determine when network switching is required", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.keys(CHAIN_ID_TO_NAME).map(Number)),
        fc.constantFrom(...SUPPORTED_CHAINS),
        (currentChainId, targetChain) => {
          const targetChainId = CHAIN_NAME_TO_ID[targetChain];
          const needsSwitch = requiresNetworkSwitch(currentChainId, targetChain);
          
          // Should require switch if and only if chain IDs differ
          expect(needsSwitch).toBe(currentChainId !== targetChainId);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Block explorer URLs should be valid HTTPS URLs for all chains.
   * 
   * Validates: Requirements 8.4
   */
  it("should generate valid block explorer URLs for all chains", () => {
    // Generate hex strings using array and map
    const hexChars = '0123456789abcdef';
    
    fc.assert(
      fc.property(
        fc.constantFrom(...SUPPORTED_CHAINS),
        fc.array(fc.integer({ min: 0, max: 15 }), { minLength: 64, maxLength: 64 })
          .map((arr) => `0x${arr.map(i => hexChars[i]).join('')}`),
        (chain, hash) => {
          const txUrl = getTransactionExplorerUrl(chain, hash);
          const addressUrl = getAddressExplorerUrl(chain, hash);
          
          // URLs should be valid HTTPS URLs
          expect(txUrl).toMatch(/^https:\/\/.+\/tx\/0x[a-fA-F0-9]+$/);
          expect(addressUrl).toMatch(/^https:\/\/.+\/address\/0x[a-fA-F0-9]+$/);
          
          // URLs should contain the hash
          expect(txUrl).toContain(hash);
          expect(addressUrl).toContain(hash);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Transaction history keys should be unique per chain.
   * 
   * Validates: Requirements 8.5
   */
  it("should generate unique transaction history keys per chain", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.keys(CHAIN_ID_TO_NAME).map(Number)),
        fc.constantFrom(...Object.keys(CHAIN_ID_TO_NAME).map(Number)),
        (chainId1, chainId2) => {
          const key1 = getTransactionHistoryKey(chainId1);
          const key2 = getTransactionHistoryKey(chainId2);
          
          // Keys should be strings
          expect(typeof key1).toBe("string");
          expect(typeof key2).toBe("string");
          
          // Keys should be unique for different chains
          if (chainId1 !== chainId2) {
            expect(key1).not.toBe(key2);
          } else {
            expect(key1).toBe(key2);
          }
          
          // Keys should contain the chain ID
          expect(key1).toContain(chainId1.toString());
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: getAllChains should return metadata for all supported chains.
   * 
   * Validates: Requirements 8.4
   */
  it("should return complete chain metadata for all supported chains", () => {
    fc.assert(
      fc.property(
        fc.constant(null), // No input needed
        () => {
          const allChains = getAllChains();
          
          // Should have same count as supported chains
          expect(allChains.length).toBe(SUPPORTED_CHAINS.length);
          
          // Each chain should have complete metadata
          allChains.forEach((chain) => {
            expect(chain.id).toBeGreaterThan(0);
            expect(chain.name).toBeTruthy();
            expect(chain.shortName).toBeTruthy();
            expect(chain.nativeCurrency).toBeDefined();
            expect(chain.nativeCurrency.symbol).toBeTruthy();
            expect(chain.blockExplorer).toMatch(/^https?:\/\//);
            expect(chain.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: getChainsForToken should return only chains that support the token.
   * 
   * Validates: Requirements 8.4, 8.6
   */
  it("should return only chains that support a given token", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(TOKEN_WHITELIST).flat()),
        (token) => {
          const chains = getChainsForToken(token);
          
          // All returned chains should support the token
          chains.forEach((chain) => {
            const chainName = CHAIN_ID_TO_NAME[chain.id];
            expect(chainName).toBeDefined();
            expect(TOKEN_WHITELIST[chainName]).toContain(token.toUpperCase());
          });
          
          // Should not miss any chains that support the token
          const expectedChains = SUPPORTED_CHAINS.filter(
            (c) => TOKEN_WHITELIST[c].includes(token.toUpperCase())
          );
          expect(chains.length).toBe(expectedChains.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: getTokensForChain should return all tokens supported on that chain.
   * 
   * Validates: Requirements 8.4
   */
  it("should return all tokens supported on a given chain", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SUPPORTED_CHAINS),
        (chain) => {
          const tokens = getTokensForChain(chain);
          
          // Should match the whitelist exactly
          expect(tokens).toEqual(TOKEN_WHITELIST[chain]);
          
          // All tokens should be strings
          tokens.forEach((token) => {
            expect(typeof token).toBe("string");
            expect(token.length).toBeGreaterThan(0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Each chain should have a valid native token defined.
   * 
   * Validates: Requirements 8.4
   */
  it("should have valid native tokens for all chains", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SUPPORTED_CHAINS),
        (chain) => {
          const nativeToken = getNativeToken(chain);
          
          // Native token should be defined
          expect(nativeToken).toBeTruthy();
          
          // Native token should be in the chain's whitelist
          expect(TOKEN_WHITELIST[chain]).toContain(nativeToken);
          
          // isNativeToken should return true for the native token
          expect(isNativeToken(nativeToken, chain)).toBe(true);
          
          // isNativeToken should return false for non-native tokens
          const nonNativeTokens = TOKEN_WHITELIST[chain].filter(
            (t) => t !== nativeToken
          );
          nonNativeTokens.forEach((token) => {
            expect(isNativeToken(token, chain)).toBe(false);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: formatChainName should return valid display names.
   * 
   * Validates: Requirements 8.4
   */
  it("should format chain names correctly", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SUPPORTED_CHAINS),
        fc.boolean(),
        (chain, short) => {
          const formatted = formatChainName(chain, short);
          const config = CHAIN_CONFIG[chain];
          
          // Should return the appropriate name format
          if (short) {
            expect(formatted).toBe(config.shortName);
          } else {
            expect(formatted).toBe(config.name);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
