import { http, cookieStorage, createConfig, createStorage } from "wagmi";
import {
  mainnet,
  base,
  optimism,
  arbitrum,
  polygon,
  bsc,
  avalanche,
} from "wagmi/chains";
import { CHAIN_CONFIG, CHAIN_ID_TO_NAME, type SupportedChain } from "./chains";

/**
 * Supported EVM chains for the DeFi Intent Interface.
 * Includes Ethereum mainnet and major Layer 2/alternative chains.
 */
export const supportedChains = [
  mainnet,
  base,
  optimism,
  arbitrum,
  polygon,
  bsc,
  avalanche,
] as const;

/**
 * Chain IDs mapped to their names for easy lookup.
 * Uses the centralized chain configuration.
 */
export const chainIdToName: Record<number, string> = {
  [mainnet.id]: CHAIN_CONFIG.ethereum.name,
  [base.id]: CHAIN_CONFIG.base.name,
  [optimism.id]: CHAIN_CONFIG.optimism.name,
  [arbitrum.id]: CHAIN_CONFIG.arbitrum.name,
  [polygon.id]: CHAIN_CONFIG.polygon.name,
  [bsc.id]: CHAIN_CONFIG.bsc.name,
  [avalanche.id]: CHAIN_CONFIG.avalanche.name,
};

/**
 * Get chain name (lowercase) from chain ID.
 * Returns the SupportedChain type for use with schemas.
 */
export function getChainNameFromId(chainId: number): SupportedChain | undefined {
  return CHAIN_ID_TO_NAME[chainId];
}

/**
 * Creates the Wagmi configuration with cookie storage for SSR compatibility.
 * Uses cookieStorage to persist wallet connection state across server and client,
 * preventing hydration mismatches.
 * 
 * multiInjectedProviderDiscovery: true enables automatic detection of all
 * installed wallet extensions (Rabby, Phantom, Backpack, MetaMask, etc.)
 * 
 * @returns Wagmi configuration object
 */
export function getConfig() {
  return createConfig({
    chains: supportedChains,
    // Enable automatic discovery of all injected wallet providers
    // This detects Rabby, Phantom, Backpack, MetaMask, and other EIP-6963 wallets
    multiInjectedProviderDiscovery: true,
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [mainnet.id]: http(),
      [base.id]: http(),
      [optimism.id]: http(),
      [arbitrum.id]: http(),
      [polygon.id]: http(),
      [bsc.id]: http(),
      [avalanche.id]: http(),
    },
  });
}

/**
 * Singleton config instance for use throughout the application.
 */
export const config = getConfig();

/**
 * Type for the Wagmi config to use in type-safe contexts.
 */
export type WagmiConfig = ReturnType<typeof getConfig>;
