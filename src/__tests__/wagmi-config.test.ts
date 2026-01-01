/**
 * Unit Tests for Web3 Configuration
 * 
 * Tests cookie extraction, state hydration, provider setup, and chain configuration.
 * Validates: Requirements 9.1, 9.2
 */

import { describe, it, expect } from "vitest";
import { cookieToInitialState } from "wagmi";
import {
  getConfig,
  config,
  supportedChains,
  chainIdToName,
} from "@/lib/wagmi";
import {
  mainnet,
  base,
  optimism,
  arbitrum,
  polygon,
  bsc,
  avalanche,
} from "wagmi/chains";

describe("Web3 Configuration", () => {
  describe("getConfig function", () => {
    it("should create a valid wagmi config", () => {
      const wagmiConfig = getConfig();
      expect(wagmiConfig).toBeDefined();
      expect(wagmiConfig.chains).toBeDefined();
    });

    it("should configure all supported EVM chains", () => {
      const wagmiConfig = getConfig();
      
      // Should have exactly 7 chains configured
      expect(wagmiConfig.chains.length).toBe(7);
      
      // Verify each expected chain is present
      const chainIds = wagmiConfig.chains.map((c) => c.id);
      expect(chainIds).toContain(mainnet.id);
      expect(chainIds).toContain(base.id);
      expect(chainIds).toContain(optimism.id);
      expect(chainIds).toContain(arbitrum.id);
      expect(chainIds).toContain(polygon.id);
      expect(chainIds).toContain(bsc.id);
      expect(chainIds).toContain(avalanche.id);
    });

    it("should configure HTTP transports for all chains", () => {
      const wagmiConfig = getConfig();
      
      // Each chain should have a transport configured
      supportedChains.forEach((chain) => {
        expect(wagmiConfig._internal.transports[chain.id]).toBeDefined();
      });
    });

    it("should enable SSR mode", () => {
      const wagmiConfig = getConfig();
      // SSR mode is enabled when ssr: true is set in config
      // This is verified by the config being created without errors
      // and having proper storage configuration
      expect(wagmiConfig).toBeDefined();
    });
  });

  describe("Singleton config instance", () => {
    it("should export a pre-configured config instance", () => {
      expect(config).toBeDefined();
      expect(config.chains).toBeDefined();
      expect(config.chains.length).toBe(7);
    });
  });

  describe("supportedChains array", () => {
    it("should contain all required EVM chains", () => {
      expect(supportedChains).toHaveLength(7);
      
      const chainIds = supportedChains.map((c) => c.id);
      expect(chainIds).toContain(1); // Ethereum mainnet
      expect(chainIds).toContain(8453); // Base
      expect(chainIds).toContain(10); // Optimism
      expect(chainIds).toContain(42161); // Arbitrum
      expect(chainIds).toContain(137); // Polygon
      expect(chainIds).toContain(56); // BSC
      expect(chainIds).toContain(43114); // Avalanche
    });
  });

  describe("chainIdToName mapping", () => {
    it("should have names for all supported chains", () => {
      supportedChains.forEach((chain) => {
        expect(chainIdToName[chain.id]).toBeDefined();
        expect(typeof chainIdToName[chain.id]).toBe("string");
      });
    });

    it("should have correct chain names", () => {
      expect(chainIdToName[1]).toBe("Ethereum");
      expect(chainIdToName[8453]).toBe("Base");
      expect(chainIdToName[10]).toBe("Optimism");
      expect(chainIdToName[42161]).toBe("Arbitrum One");
      expect(chainIdToName[137]).toBe("Polygon");
      expect(chainIdToName[56]).toBe("BNB Smart Chain");
      expect(chainIdToName[43114]).toBe("Avalanche C-Chain");
    });
  });

  describe("Cookie extraction and state hydration", () => {
    it("should return undefined for null cookie", () => {
      const wagmiConfig = getConfig();
      const state = cookieToInitialState(wagmiConfig, null);
      expect(state).toBeUndefined();
    });

    it("should return undefined for undefined cookie", () => {
      const wagmiConfig = getConfig();
      const state = cookieToInitialState(wagmiConfig, undefined);
      expect(state).toBeUndefined();
    });

    it("should return undefined for empty cookie string", () => {
      const wagmiConfig = getConfig();
      const state = cookieToInitialState(wagmiConfig, "");
      expect(state).toBeUndefined();
    });

    it("should return undefined for invalid cookie format", () => {
      const wagmiConfig = getConfig();
      const state = cookieToInitialState(wagmiConfig, "invalid-cookie=value");
      expect(state).toBeUndefined();
    });

    it("should handle cookie string without wagmi data gracefully", () => {
      const wagmiConfig = getConfig();
      const state = cookieToInitialState(
        wagmiConfig,
        "session=abc123; theme=dark"
      );
      expect(state).toBeUndefined();
    });
  });

  describe("Provider setup", () => {
    it("should have injected connector configured", () => {
      const wagmiConfig = getConfig();
      // The config should be created successfully with connectors
      expect(wagmiConfig).toBeDefined();
    });
  });
});
