/**
 * Testing Infrastructure Module
 * 
 * Provides:
 * - Mock blockchain responses for consistent testing
 * - AI response mocking for predictable test scenarios
 * - Test environment configuration with proper isolation
 * - Utility functions for property-based testing
 * 
 * Requirements: 10.2, 10.3
 */

import { type Address } from "viem";
import type { SupportedChain } from "./schemas";

/**
 * Mock AI response structure
 */
export interface MockAIResponse {
  text: string;
  toolCalls?: MockToolCall[];
  finishReason: "stop" | "tool-calls" | "length" | "error";
}

/**
 * Mock tool call structure
 */
export interface MockToolCall {
  toolCallId: string;
  toolName: "swapTokens" | "checkBalance";
  args: Record<string, unknown>;
}

/**
 * AI response mock generator
 * Creates predictable AI responses for testing
 * 
 * Requirements: 10.2
 */
export const mockAIResponses = {
  /**
   * Generate a swap intent response
   */
  swapIntent(params: {
    tokenIn: string;
    tokenOut: string;
    amount: number;
    chain: SupportedChain;
  }): MockAIResponse {
    return {
      text: `I'll help you swap ${params.amount} ${params.tokenIn} for ${params.tokenOut} on ${params.chain}.`,
      toolCalls: [
        {
          toolCallId: `call_${Date.now()}`,
          toolName: "swapTokens",
          args: {
            tokenIn: params.tokenIn,
            tokenOut: params.tokenOut,
            amount: params.amount,
            chain: params.chain,
          },
        },
      ],
      finishReason: "tool-calls",
    };
  },

  /**
   * Generate a balance check response
   */
  balanceCheck(params: { token: string; chain: SupportedChain }): MockAIResponse {
    return {
      text: `Let me check your ${params.token} balance on ${params.chain}.`,
      toolCalls: [
        {
          toolCallId: `call_${Date.now()}`,
          toolName: "checkBalance",
          args: {
            token: params.token,
            chain: params.chain,
          },
        },
      ],
      finishReason: "tool-calls",
    };
  },

  /**
   * Generate a clarification request response
   */
  clarificationRequest(question: string): MockAIResponse {
    return {
      text: question,
      finishReason: "stop",
    };
  },

  /**
   * Generate an error response
   */
  errorResponse(message: string): MockAIResponse {
    return {
      text: `I'm sorry, but ${message}`,
      finishReason: "stop",
    };
  },

  /**
   * Generate a multi-step response
   */
  multiStep(steps: MockToolCall[]): MockAIResponse {
    return {
      text: "I'll help you with this multi-step operation.",
      toolCalls: steps,
      finishReason: "tool-calls",
    };
  },
};

/**
 * Mock blockchain data generator
 * Creates consistent blockchain data for testing
 * 
 * Requirements: 10.2
 */
export const mockBlockchainData = {
  /**
   * Generate a mock address
   */
  address(seed?: number): Address {
    const hex = (seed ?? Math.floor(Math.random() * 0xffffffff))
      .toString(16)
      .padStart(8, "0");
    return `0x${hex.repeat(5)}` as Address;
  },

  /**
   * Generate a mock transaction hash
   */
  txHash(seed?: number): string {
    const hex = (seed ?? Math.floor(Math.random() * 0xffffffff))
      .toString(16)
      .padStart(8, "0");
    return `0x${hex.repeat(8)}`;
  },

  /**
   * Generate mock balance data
   */
  balance(token: string, amount?: bigint): {
    token: string;
    balance: bigint;
    decimals: number;
    formatted: string;
  } {
    const decimals = ["USDC", "USDT"].includes(token.toUpperCase()) ? 6 : 18;
    const balance = amount ?? BigInt(Math.floor(Math.random() * 1e18));
    const formatted = (Number(balance) / Math.pow(10, decimals)).toFixed(4);
    
    return { token, balance, decimals, formatted };
  },

  /**
   * Generate mock transaction receipt
   */
  receipt(hash: string, success: boolean = true) {
    return {
      transactionHash: hash,
      status: success ? ("success" as const) : ("reverted" as const),
      blockNumber: BigInt(Math.floor(Math.random() * 1000000) + 18000000),
      blockHash: this.txHash(),
      gasUsed: BigInt(Math.floor(Math.random() * 100000) + 21000),
      effectiveGasPrice: BigInt(Math.floor(Math.random() * 50) + 10) * BigInt(1e9),
      from: this.address(),
      to: this.address(),
      logs: [],
    };
  },

  /**
   * Generate mock gas estimate
   */
  gasEstimate(): bigint {
    return BigInt(Math.floor(Math.random() * 200000) + 21000);
  },

  /**
   * Generate mock block data
   */
  block(number?: bigint) {
    const blockNumber = number ?? BigInt(Math.floor(Math.random() * 1000000) + 18000000);
    return {
      number: blockNumber,
      hash: this.txHash(),
      timestamp: BigInt(Math.floor(Date.now() / 1000)),
      baseFeePerGas: BigInt(Math.floor(Math.random() * 50) + 10) * BigInt(1e9),
    };
  },
};

/**
 * Test fixture generator for property-based testing
 */
export const testFixtures = {
  /**
   * Generate valid swap parameters
   */
  swapParams(overrides?: Partial<{
    tokenIn: string;
    tokenOut: string;
    amount: number;
    chain: SupportedChain;
  }>) {
    return {
      tokenIn: overrides?.tokenIn ?? "ETH",
      tokenOut: overrides?.tokenOut ?? "USDC",
      amount: overrides?.amount ?? 1.0,
      chain: overrides?.chain ?? "ethereum",
    };
  },

  /**
   * Generate valid balance check parameters
   */
  balanceParams(overrides?: Partial<{ token: string; chain: SupportedChain }>) {
    return {
      token: overrides?.token ?? "ETH",
      chain: overrides?.chain ?? "ethereum",
    };
  },

  /**
   * Generate mock wallet state
   */
  walletState(overrides?: Partial<{
    address: Address;
    chainId: number;
    isConnected: boolean;
  }>) {
    return {
      address: overrides?.address ?? mockBlockchainData.address(),
      chainId: overrides?.chainId ?? 1,
      isConnected: overrides?.isConnected ?? true,
    };
  },

  /**
   * Generate mock conversation history
   */
  conversationHistory(messageCount: number = 3) {
    const messages = [];
    for (let i = 0; i < messageCount; i++) {
      messages.push({
        id: `msg_${i}`,
        role: i % 2 === 0 ? "user" : "assistant",
        content: i % 2 === 0 ? "User message" : "Assistant response",
        createdAt: new Date(Date.now() - (messageCount - i) * 60000),
      });
    }
    return messages;
  },
};

/**
 * Test environment configuration
 */
export interface TestEnvironment {
  mockWallet: boolean;
  mockAI: boolean;
  mockBlockchain: boolean;
  simulateLatency: boolean;
  latencyMs: number;
}

/**
 * Default test environment
 */
export const DEFAULT_TEST_ENV: TestEnvironment = {
  mockWallet: true,
  mockAI: true,
  mockBlockchain: true,
  simulateLatency: false,
  latencyMs: 100,
};

/**
 * Test environment manager
 * Provides isolated test environments
 * 
 * Requirements: 10.2
 */
export class TestEnvironmentManager {
  private config: TestEnvironment;
  private originalEnv: Record<string, string | undefined> = {};

  constructor(config: Partial<TestEnvironment> = {}) {
    this.config = { ...DEFAULT_TEST_ENV, ...config };
  }

  /**
   * Set up the test environment
   */
  setup(): void {
    // Store original environment variables
    this.originalEnv = {
      NODE_ENV: process.env.NODE_ENV,
    };

    // Note: NODE_ENV is read-only in some environments
    // The test environment is typically set by the test runner
  }

  /**
   * Tear down the test environment
   */
  teardown(): void {
    // Clean up any test-specific state
    // Environment variables are managed by the test runner
  }

  /**
   * Get current configuration
   */
  getConfig(): TestEnvironment {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<TestEnvironment>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Simulate network latency if enabled
   */
  async maybeDelay(): Promise<void> {
    if (this.config.simulateLatency) {
      await new Promise((resolve) => setTimeout(resolve, this.config.latencyMs));
    }
  }
}

/**
 * Assertion helpers for testing
 */
export const assertions = {
  /**
   * Assert that a value is a valid Ethereum address
   */
  isValidAddress(value: unknown): value is Address {
    return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);
  },

  /**
   * Assert that a value is a valid transaction hash
   */
  isValidTxHash(value: unknown): value is string {
    return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value);
  },

  /**
   * Assert that a tool call has valid structure
   */
  isValidToolCall(value: unknown): value is MockToolCall {
    if (typeof value !== "object" || value === null) return false;
    const obj = value as Record<string, unknown>;
    return (
      typeof obj.toolCallId === "string" &&
      typeof obj.toolName === "string" &&
      typeof obj.args === "object"
    );
  },

  /**
   * Assert that an AI response has valid structure
   */
  isValidAIResponse(value: unknown): value is MockAIResponse {
    if (typeof value !== "object" || value === null) return false;
    const obj = value as Record<string, unknown>;
    return (
      typeof obj.text === "string" &&
      ["stop", "tool-calls", "length", "error"].includes(obj.finishReason as string)
    );
  },
};

/**
 * Cookie testing utilities
 */
export const cookieTestUtils = {
  /**
   * Create a mock cookie string
   */
  createCookie(name: string, value: string, options?: {
    maxAge?: number;
    path?: string;
    secure?: boolean;
    httpOnly?: boolean;
  }): string {
    let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
    
    if (options?.maxAge) cookie += `; Max-Age=${options.maxAge}`;
    if (options?.path) cookie += `; Path=${options.path}`;
    if (options?.secure) cookie += "; Secure";
    if (options?.httpOnly) cookie += "; HttpOnly";
    
    return cookie;
  },

  /**
   * Parse a cookie string into key-value pairs
   */
  parseCookies(cookieString: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    
    if (!cookieString) return cookies;
    
    cookieString.split(";").forEach((cookie) => {
      const [name, ...valueParts] = cookie.trim().split("=");
      if (name) {
        try {
          cookies[decodeURIComponent(name)] = decodeURIComponent(valueParts.join("="));
        } catch {
          // Handle malformed URI-encoded strings gracefully
          // Store the raw value if decoding fails
          cookies[name] = valueParts.join("=");
        }
      }
    });
    
    return cookies;
  },

  /**
   * Create a mock wagmi state cookie
   */
  createWagmiStateCookie(state: {
    chainId?: number;
    status?: string;
  }): string {
    const stateValue = JSON.stringify({
      state: {
        chainId: state.chainId ?? 1,
        status: state.status ?? "disconnected",
        connections: [],
        current: null,
      },
      version: 2,
    });
    
    return this.createCookie("wagmi.store", stateValue);
  },
};

/**
 * Streaming test utilities
 */
export const streamingTestUtils = {
  /**
   * Create a mock readable stream from chunks
   */
  createMockStream(chunks: string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    let index = 0;

    return new ReadableStream({
      pull(controller) {
        if (index < chunks.length) {
          controller.enqueue(encoder.encode(chunks[index]));
          index++;
        } else {
          controller.close();
        }
      },
    });
  },

  /**
   * Collect all chunks from a stream
   */
  async collectStream(stream: ReadableStream<Uint8Array>): Promise<string> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let result = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value, { stream: true });
    }

    return result;
  },

  /**
   * Create mock SSE (Server-Sent Events) data
   */
  createSSEData(events: Array<{ event?: string; data: string }>): string {
    return events
      .map((e) => {
        let result = "";
        if (e.event) result += `event: ${e.event}\n`;
        result += `data: ${e.data}\n\n`;
        return result;
      })
      .join("");
  },
};
