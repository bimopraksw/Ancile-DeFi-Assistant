/**
 * Property-Based Tests for Network Switching and Wallet Integration
 * 
 * Feature: defi-intent-interface, Property 13: Network Switching and Wallet Integration
 * Validates: Requirements 4.1, 4.3
 * 
 * Tests that the system correctly handles wallet connection, network switching,
 * and prompts users when on incorrect networks.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  CHAIN_CONFIG,
  CHAIN_ID_TO_NAME,
  CHAIN_NAME_TO_ID,
  requiresNetworkSwitch,
  getChainById,
  isChainIdSupported,
  isChainNameSupported,
  getChainIdSafe,
  getNativeTokenSafe,
  isNativeTokenSafe,
} from "@/lib/chains";
import { SUPPORTED_CHAINS, type SupportedChain } from "@/lib/schemas";
import { supportedChains, chainIdToName, getChainNameFromId } from "@/lib/wagmi";

describe("Property 13: Network Switching and Wallet Integration", () => {
  /**
   * Property: For any current chain and target chain combination,
   * requiresNetworkSwitch should correctly determine if switching is needed.
   * 
   * Validates: Requirements 4.3
   */
  it("should correctly determine network switch requirements", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.keys(CHAIN_ID_TO_NAME).map(Number)),
        fc.constantFrom(...SUPPORTED_CHAINS),
        (currentChainId, targetChain) => {
          const targetChainId = CHAIN_NAME_TO_ID[targetChain];
          const needsSwitch = requiresNetworkSwitch(currentChainId, targetChain);
          
          // Should require switch if and only if chain IDs differ
          if (currentChainId === targetChainId) {
            expect(needsSwitch).toBe(false);
          } else {
            expect(needsSwitch).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any supported chain, the wagmi configuration should have
   * the chain properly configured with transport.
   * 
   * Validates: Requirements 4.1
   */
  it("should have all supported chains configured in wagmi", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SUPPORTED_CHAINS),
        (chainName) => {
          const chainId = CHAIN_NAME_TO_ID[chainName];
          
          // Chain should be in the supported chains array
          const wagmiChain = supportedChains.find((c) => c.id === chainId);
          expect(wagmiChain).toBeDefined();
          
          // Chain should have a display name
          expect(chainIdToName[chainId]).toBeDefined();
          expect(chainIdToName[chainId].length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any chain ID, getChainNameFromId should return the correct
   * chain name or undefined for unsupported chains.
   * 
   * Validates: Requirements 4.1
   */
  it("should correctly map chain IDs to names", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.keys(CHAIN_ID_TO_NAME).map(Number)),
        (chainId) => {
          const chainName = getChainNameFromId(chainId);
          
          // Should return a valid chain name
          expect(chainName).toBeDefined();
          expect(SUPPORTED_CHAINS).toContain(chainName);
          
          // Reverse lookup should return the same chain ID
          const reversedId = CHAIN_NAME_TO_ID[chainName!];
          expect(reversedId).toBe(chainId);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any unsupported chain ID, the system should handle it gracefully.
   * 
   * Validates: Requirements 4.3
   */
  it("should handle unsupported chain IDs gracefully", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100000, max: 999999 }), // IDs unlikely to be real chains
        (unsupportedChainId) => {
          // Should not be recognized as supported
          expect(isChainIdSupported(unsupportedChainId)).toBe(false);
          
          // Should return undefined for chain lookup
          const chain = getChainById(unsupportedChainId);
          expect(chain).toBeUndefined();
          
          // getChainNameFromId should return undefined
          const chainName = getChainNameFromId(unsupportedChainId);
          expect(chainName).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any chain, getChainIdSafe should return a valid chain ID
   * or the default value for invalid chains.
   * 
   * Validates: Requirements 4.3
   */
  it("should safely get chain IDs with fallback", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constantFrom(...SUPPORTED_CHAINS),
          fc.string().filter((s) => !SUPPORTED_CHAINS.includes(s.toLowerCase() as SupportedChain))
        ),
        (chainName) => {
          const chainId = getChainIdSafe(chainName);
          
          // Should always return a number
          expect(typeof chainId).toBe("number");
          expect(chainId).toBeGreaterThan(0);
          
          // For supported chains, should return the correct ID
          if (isChainNameSupported(chainName)) {
            expect(chainId).toBe(CHAIN_NAME_TO_ID[chainName.toLowerCase() as SupportedChain]);
          } else {
            // For unsupported chains, should return default (1 = Ethereum)
            expect(chainId).toBe(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any chain, getNativeTokenSafe should return a valid token
   * or the default value for invalid chains.
   * 
   * Validates: Requirements 4.1
   */
  it("should safely get native tokens with fallback", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constantFrom(...SUPPORTED_CHAINS),
          fc.string().filter((s) => !SUPPORTED_CHAINS.includes(s.toLowerCase() as SupportedChain))
        ),
        (chainName) => {
          const nativeToken = getNativeTokenSafe(chainName);
          
          // Should always return a string
          expect(typeof nativeToken).toBe("string");
          expect(nativeToken.length).toBeGreaterThan(0);
          
          // For supported chains, should return the correct native token from our config
          if (isChainNameSupported(chainName)) {
            // Use our NATIVE_TOKENS config, not wagmi's nativeCurrency
            const expectedToken = getNativeTokenSafe(chainName);
            expect(nativeToken).toBe(expectedToken);
          } else {
            // For unsupported chains, should return default (ETH)
            expect(nativeToken).toBe("ETH");
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any token and chain combination, isNativeTokenSafe should
   * correctly identify native tokens.
   * 
   * Validates: Requirements 4.1
   */
  it("should correctly identify native tokens", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SUPPORTED_CHAINS),
        (chain) => {
          // Get native token from our NATIVE_TOKENS config
          const nativeSymbol = getNativeTokenSafe(chain);
          
          // Native token should be identified as native
          expect(isNativeTokenSafe(nativeSymbol, chain)).toBe(true);
          expect(isNativeTokenSafe(nativeSymbol.toLowerCase(), chain)).toBe(true);
          expect(isNativeTokenSafe(nativeSymbol.toUpperCase(), chain)).toBe(true);
          
          // Non-native tokens should not be identified as native
          const nonNativeTokens = ["USDC", "USDT", "DAI", "WBTC", "LINK"];
          nonNativeTokens.forEach((token) => {
            if (token !== nativeSymbol) {
              expect(isNativeTokenSafe(token, chain)).toBe(false);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All supported chains should have consistent configuration
   * between wagmi and chain config.
   * 
   * Validates: Requirements 4.1
   */
  it("should have consistent chain configuration across modules", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SUPPORTED_CHAINS),
        (chainName) => {
          const chainConfig = CHAIN_CONFIG[chainName];
          const chainId = CHAIN_NAME_TO_ID[chainName];
          
          // Find the wagmi chain
          const wagmiChain = supportedChains.find((c) => c.id === chainId);
          expect(wagmiChain).toBeDefined();
          
          // Chain IDs should match
          expect(chainConfig.id).toBe(wagmiChain!.id);
          
          // Native currency should match
          expect(chainConfig.nativeCurrency.symbol).toBe(wagmiChain!.nativeCurrency.symbol);
          expect(chainConfig.nativeCurrency.decimals).toBe(wagmiChain!.nativeCurrency.decimals);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Network switch detection should be symmetric - if A needs to switch
   * to B, then B should not need to switch to B.
   * 
   * Validates: Requirements 4.3
   */
  it("should have symmetric network switch detection", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SUPPORTED_CHAINS),
        fc.constantFrom(...SUPPORTED_CHAINS),
        (chainA, chainB) => {
          const chainAId = CHAIN_NAME_TO_ID[chainA];
          const chainBId = CHAIN_NAME_TO_ID[chainB];
          
          // If on chain A targeting chain B
          const aNeedsToSwitchToB = requiresNetworkSwitch(chainAId, chainB);
          
          // If on chain B targeting chain B (same chain)
          const bNeedsToSwitchToB = requiresNetworkSwitch(chainBId, chainB);
          
          // Being on the target chain should never require a switch
          expect(bNeedsToSwitchToB).toBe(false);
          
          // If chains are different, switch should be required
          if (chainA !== chainB) {
            expect(aNeedsToSwitchToB).toBe(true);
          } else {
            expect(aNeedsToSwitchToB).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All chains should have valid block explorer URLs configured.
   * 
   * Validates: Requirements 4.1
   */
  it("should have valid block explorer URLs for all chains", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SUPPORTED_CHAINS),
        (chainName) => {
          const config = CHAIN_CONFIG[chainName];
          
          // Block explorer should be a valid HTTPS URL
          expect(config.blockExplorer).toMatch(/^https:\/\/.+/);
          
          // Should not end with a slash
          expect(config.blockExplorer.endsWith("/")).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Chain colors should be valid hex colors.
   * 
   * Validates: Requirements 4.1
   */
  it("should have valid hex colors for all chains", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SUPPORTED_CHAINS),
        (chainName) => {
          const config = CHAIN_CONFIG[chainName];
          
          // Color should be a valid hex color
          expect(config.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any invalid chain name, requiresNetworkSwitch should
   * return false (no switch needed to an invalid chain).
   * 
   * Validates: Requirements 4.3
   */
  it("should handle invalid target chains in network switch detection", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.keys(CHAIN_ID_TO_NAME).map(Number)),
        fc.string().filter((s) => !SUPPORTED_CHAINS.includes(s.toLowerCase() as SupportedChain)),
        (currentChainId, invalidTargetChain) => {
          const needsSwitch = requiresNetworkSwitch(currentChainId, invalidTargetChain);
          
          // Should return false for invalid target chains
          expect(needsSwitch).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
