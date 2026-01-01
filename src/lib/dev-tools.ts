/**
 * Development Tooling Module
 * 
 * Provides:
 * - Mock wallet connectors for development mode
 * - Comprehensive logging for AI tool calls and blockchain interactions
 * - Error simulation capabilities for testing
 * - Development mode detection and configuration
 * 
 * Requirements: 10.1, 10.4, 10.5
 */

import { type Address } from "viem";

/**
 * Check if running in development mode
 */
export function isDevelopmentMode(): boolean {
  return process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
}

/**
 * Log levels for the logging system
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: Record<string, unknown>;
  duration?: number;
}

/**
 * Log categories for filtering
 */
export type LogCategory = 
  | "ai"           // AI tool calls and responses
  | "blockchain"   // Blockchain interactions
  | "wallet"       // Wallet operations
  | "network"      // Network requests
  | "state"        // State changes
  | "error"        // Error events
  | "performance"; // Performance metrics

/**
 * Logger configuration
 */
export interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
  categories: LogCategory[];
  maxEntries: number;
  persistToStorage: boolean;
}

/**
 * Default logger configuration
 */
const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  enabled: isDevelopmentMode(),
  minLevel: "debug",
  categories: ["ai", "blockchain", "wallet", "network", "state", "error", "performance"],
  maxEntries: 1000,
  persistToStorage: false,
};

/**
 * Log level priority for filtering
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Development Logger class
 * Provides comprehensive logging for AI tool calls and blockchain interactions
 * 
 * Requirements: 10.4
 */
export class DevLogger {
  private config: LoggerConfig;
  private entries: LogEntry[] = [];
  private listeners: Set<(entry: LogEntry) => void> = new Set();

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_LOGGER_CONFIG, ...config };
  }

  /**
   * Update logger configuration
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if a log should be recorded based on level and category
   */
  private shouldLog(level: LogLevel, category: LogCategory): boolean {
    if (!this.config.enabled) return false;
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.config.minLevel]) return false;
    if (!this.config.categories.includes(category)) return false;
    return true;
  }

  /**
   * Add a log entry
   */
  private addEntry(entry: LogEntry): void {
    this.entries.push(entry);
    
    // Trim entries if exceeding max
    if (this.entries.length > this.config.maxEntries) {
      this.entries = this.entries.slice(-this.config.maxEntries);
    }

    // Notify listeners
    this.listeners.forEach((listener) => listener(entry));

    // Console output in development
    if (isDevelopmentMode()) {
      const prefix = `[${entry.category.toUpperCase()}]`;
      const timestamp = new Date(entry.timestamp).toISOString();
      const durationStr = entry.duration ? ` (${entry.duration}ms)` : "";
      
      switch (entry.level) {
        case "debug":
          console.debug(`${timestamp} ${prefix} ${entry.message}${durationStr}`, entry.data || "");
          break;
        case "info":
          console.info(`${timestamp} ${prefix} ${entry.message}${durationStr}`, entry.data || "");
          break;
        case "warn":
          console.warn(`${timestamp} ${prefix} ${entry.message}${durationStr}`, entry.data || "");
          break;
        case "error":
          console.error(`${timestamp} ${prefix} ${entry.message}${durationStr}`, entry.data || "");
          break;
      }
    }
  }

  /**
   * Log a message
   */
  log(level: LogLevel, category: LogCategory, message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog(level, category)) return;
    
    this.addEntry({
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
    });
  }

  /**
   * Log AI tool call
   */
  logAIToolCall(toolName: string, args: Record<string, unknown>, result?: unknown): void {
    this.log("info", "ai", `Tool call: ${toolName}`, {
      toolName,
      args,
      result,
    });
  }

  /**
   * Log AI response streaming
   */
  logAIStream(event: string, data?: Record<string, unknown>): void {
    this.log("debug", "ai", `Stream event: ${event}`, data);
  }

  /**
   * Log blockchain transaction
   */
  logTransaction(
    type: "prepare" | "submit" | "confirm" | "fail",
    txHash?: string,
    data?: Record<string, unknown>
  ): void {
    this.log("info", "blockchain", `Transaction ${type}${txHash ? `: ${txHash}` : ""}`, data);
  }

  /**
   * Log wallet operation
   */
  logWallet(operation: string, data?: Record<string, unknown>): void {
    this.log("info", "wallet", `Wallet: ${operation}`, data);
  }

  /**
   * Log network request
   */
  logNetwork(method: string, url: string, duration?: number, status?: number): void {
    this.log("debug", "network", `${method} ${url}`, {
      method,
      url,
      duration,
      status,
    });
  }

  /**
   * Log state change
   */
  logState(component: string, change: string, data?: Record<string, unknown>): void {
    this.log("debug", "state", `${component}: ${change}`, data);
  }

  /**
   * Log error
   */
  logError(error: Error | string, context?: Record<string, unknown>): void {
    const message = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;
    
    this.log("error", "error", message, {
      ...context,
      stack,
    });
  }

  /**
   * Log performance metric
   */
  logPerformance(operation: string, duration: number, data?: Record<string, unknown>): void {
    this.addEntry({
      timestamp: Date.now(),
      level: "info",
      category: "performance",
      message: operation,
      data,
      duration,
    });
  }

  /**
   * Create a timer for measuring operation duration
   */
  startTimer(operation: string): () => void {
    const start = performance.now();
    return () => {
      const duration = Math.round(performance.now() - start);
      this.logPerformance(operation, duration);
    };
  }

  /**
   * Subscribe to log entries
   */
  subscribe(listener: (entry: LogEntry) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get all log entries
   */
  getEntries(filter?: { level?: LogLevel; category?: LogCategory }): LogEntry[] {
    let filtered = [...this.entries];
    
    if (filter?.level) {
      const minPriority = LOG_LEVEL_PRIORITY[filter.level];
      filtered = filtered.filter((e) => LOG_LEVEL_PRIORITY[e.level] >= minPriority);
    }
    
    if (filter?.category) {
      filtered = filtered.filter((e) => e.category === filter.category);
    }
    
    return filtered;
  }

  /**
   * Clear all log entries
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.entries, null, 2);
  }
}

/**
 * Global logger instance
 */
export const logger = new DevLogger();

/**
 * Mock wallet state for development
 */
export interface MockWalletState {
  address: Address;
  chainId: number;
  isConnected: boolean;
  balances: Record<string, bigint>;
}

/**
 * Default mock wallet state
 */
export const DEFAULT_MOCK_WALLET: MockWalletState = {
  address: "0x742d35Cc6634C0532925a3b844Bc9e7595f5bE21" as Address,
  chainId: 1,
  isConnected: true,
  balances: {
    ETH: BigInt("1000000000000000000"), // 1 ETH
    USDC: BigInt("1000000000"), // 1000 USDC (6 decimals)
    USDT: BigInt("1000000000"), // 1000 USDT (6 decimals)
    DAI: BigInt("1000000000000000000000"), // 1000 DAI
  },
};

/**
 * Mock wallet connector for development mode
 * Simulates wallet operations without real transactions
 * 
 * Requirements: 10.1
 */
export class MockWalletConnector {
  private state: MockWalletState;
  private simulateErrors: boolean = false;
  private errorType: ErrorSimulationType | null = null;

  constructor(initialState: Partial<MockWalletState> = {}) {
    this.state = { ...DEFAULT_MOCK_WALLET, ...initialState };
  }

  /**
   * Get current wallet state
   */
  getState(): MockWalletState {
    return { ...this.state };
  }

  /**
   * Update wallet state
   */
  setState(updates: Partial<MockWalletState>): void {
    this.state = { ...this.state, ...updates };
    logger.logWallet("state_update", updates);
  }

  /**
   * Simulate wallet connection
   */
  async connect(): Promise<Address> {
    if (this.simulateErrors && this.errorType === "wallet_rejected") {
      throw new Error("User rejected the connection request");
    }
    
    this.state.isConnected = true;
    logger.logWallet("connect", { address: this.state.address });
    return this.state.address;
  }

  /**
   * Simulate wallet disconnection
   */
  async disconnect(): Promise<void> {
    this.state.isConnected = false;
    logger.logWallet("disconnect");
  }

  /**
   * Simulate network switch
   */
  async switchNetwork(chainId: number): Promise<void> {
    if (this.simulateErrors && this.errorType === "network_error") {
      throw new Error("Failed to switch network");
    }
    
    this.state.chainId = chainId;
    logger.logWallet("switch_network", { chainId });
  }

  /**
   * Simulate balance query
   */
  async getBalance(token: string): Promise<bigint> {
    if (this.simulateErrors && this.errorType === "rpc_error") {
      throw new Error("RPC error: Failed to fetch balance");
    }
    
    const balance = this.state.balances[token.toUpperCase()] || BigInt(0);
    logger.logWallet("get_balance", { token, balance: balance.toString() });
    return balance;
  }

  /**
   * Simulate transaction signing
   */
  async signTransaction(tx: {
    to: Address;
    value?: bigint;
    data?: string;
  }): Promise<string> {
    if (!this.state.isConnected) {
      throw new Error("Wallet not connected");
    }
    
    if (this.simulateErrors) {
      switch (this.errorType) {
        case "wallet_rejected":
          throw new Error("User rejected the transaction");
        case "insufficient_funds":
          throw new Error("Insufficient funds for transaction");
        case "gas_estimation_failed":
          throw new Error("Gas estimation failed");
      }
    }
    
    // Generate mock transaction hash
    const mockHash = `0x${Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join("")}`;
    
    logger.logTransaction("submit", mockHash, { to: tx.to, value: tx.value?.toString() });
    return mockHash;
  }

  /**
   * Simulate transaction confirmation
   */
  async waitForTransaction(hash: string): Promise<{ status: "success" | "reverted" }> {
    if (this.simulateErrors && this.errorType === "tx_reverted") {
      logger.logTransaction("fail", hash, { reason: "Transaction reverted" });
      return { status: "reverted" };
    }
    
    // Simulate confirmation delay
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    logger.logTransaction("confirm", hash);
    return { status: "success" };
  }

  /**
   * Enable error simulation
   */
  enableErrorSimulation(errorType: ErrorSimulationType): void {
    this.simulateErrors = true;
    this.errorType = errorType;
    logger.log("info", "wallet", `Error simulation enabled: ${errorType}`);
  }

  /**
   * Disable error simulation
   */
  disableErrorSimulation(): void {
    this.simulateErrors = false;
    this.errorType = null;
    logger.log("info", "wallet", "Error simulation disabled");
  }
}

/**
 * Error simulation types
 */
export type ErrorSimulationType =
  | "network_error"
  | "wallet_rejected"
  | "insufficient_funds"
  | "gas_estimation_failed"
  | "tx_reverted"
  | "rpc_error"
  | "timeout"
  | "rate_limited";

/**
 * Error simulator for testing error handling
 * 
 * Requirements: 10.3
 */
export class ErrorSimulator {
  private activeSimulations: Set<ErrorSimulationType> = new Set();
  private simulationProbability: number = 1.0;

  /**
   * Enable a specific error simulation
   */
  enable(errorType: ErrorSimulationType, probability: number = 1.0): void {
    this.activeSimulations.add(errorType);
    this.simulationProbability = probability;
    logger.log("info", "error", `Error simulation enabled: ${errorType}`, { probability });
  }

  /**
   * Disable a specific error simulation
   */
  disable(errorType: ErrorSimulationType): void {
    this.activeSimulations.delete(errorType);
    logger.log("info", "error", `Error simulation disabled: ${errorType}`);
  }

  /**
   * Disable all error simulations
   */
  disableAll(): void {
    this.activeSimulations.clear();
    logger.log("info", "error", "All error simulations disabled");
  }

  /**
   * Check if an error should be simulated
   */
  shouldSimulate(errorType: ErrorSimulationType): boolean {
    if (!this.activeSimulations.has(errorType)) return false;
    return Math.random() < this.simulationProbability;
  }

  /**
   * Throw a simulated error if enabled
   */
  maybeThrow(errorType: ErrorSimulationType): void {
    if (!this.shouldSimulate(errorType)) return;

    const errors: Record<ErrorSimulationType, Error> = {
      network_error: new Error("Network connection failed"),
      wallet_rejected: new Error("User rejected the request"),
      insufficient_funds: new Error("Insufficient funds for transaction"),
      gas_estimation_failed: new Error("Gas estimation failed"),
      tx_reverted: new Error("Transaction reverted"),
      rpc_error: new Error("RPC provider error"),
      timeout: new Error("Request timed out"),
      rate_limited: new Error("Rate limit exceeded"),
    };

    logger.logError(errors[errorType], { simulated: true, errorType });
    throw errors[errorType];
  }

  /**
   * Get list of active simulations
   */
  getActiveSimulations(): ErrorSimulationType[] {
    return Array.from(this.activeSimulations);
  }
}

/**
 * Global error simulator instance
 */
export const errorSimulator = new ErrorSimulator();

/**
 * Mock blockchain response generator
 * Creates consistent mock responses for testing
 */
export const mockResponses = {
  /**
   * Generate mock balance response
   */
  balance(token: string, amount: bigint): { token: string; balance: string; formatted: string } {
    const decimals = token === "USDC" || token === "USDT" ? 6 : 18;
    const formatted = (Number(amount) / Math.pow(10, decimals)).toFixed(4);
    return { token, balance: amount.toString(), formatted };
  },

  /**
   * Generate mock transaction receipt
   */
  transactionReceipt(hash: string, status: "success" | "reverted" = "success") {
    return {
      transactionHash: hash,
      status: status === "success" ? 1 : 0,
      blockNumber: BigInt(Math.floor(Math.random() * 1000000) + 18000000),
      gasUsed: BigInt(Math.floor(Math.random() * 100000) + 21000),
      effectiveGasPrice: BigInt(Math.floor(Math.random() * 50) + 10) * BigInt(1e9),
    };
  },

  /**
   * Generate mock swap quote
   */
  swapQuote(tokenIn: string, tokenOut: string, amountIn: bigint) {
    // Simple mock exchange rate
    const rates: Record<string, Record<string, number>> = {
      ETH: { USDC: 2000, USDT: 2000, DAI: 2000 },
      USDC: { ETH: 0.0005, USDT: 1, DAI: 1 },
      USDT: { ETH: 0.0005, USDC: 1, DAI: 1 },
      DAI: { ETH: 0.0005, USDC: 1, USDT: 1 },
    };

    const rate = rates[tokenIn]?.[tokenOut] || 1;
    const amountOut = BigInt(Math.floor(Number(amountIn) * rate));

    return {
      tokenIn,
      tokenOut,
      amountIn: amountIn.toString(),
      amountOut: amountOut.toString(),
      rate,
      priceImpact: Math.random() * 0.5, // 0-0.5%
      gasEstimate: BigInt(150000),
    };
  },
};

/**
 * Development mode utilities
 */
export const devUtils = {
  /**
   * Check if development mode is active
   */
  isDev: isDevelopmentMode,

  /**
   * Log only in development mode
   */
  devLog(message: string, data?: Record<string, unknown>): void {
    if (isDevelopmentMode()) {
      console.log(`[DEV] ${message}`, data || "");
    }
  },

  /**
   * Assert only in development mode
   */
  devAssert(condition: boolean, message: string): void {
    if (isDevelopmentMode() && !condition) {
      console.error(`[DEV ASSERT FAILED] ${message}`);
    }
  },

  /**
   * Measure execution time of an async function
   */
  async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const endTimer = logger.startTimer(name);
    try {
      return await fn();
    } finally {
      endTimer();
    }
  },
};
