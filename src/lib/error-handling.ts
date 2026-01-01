/**
 * Comprehensive Error Handling and Recovery Module
 * 
 * Provides:
 * - Exponential backoff for network operations
 * - Graceful degradation for failed features
 * - User-friendly error messages with actionable guidance
 * - State recovery mechanisms
 * 
 * Requirements: 7.4, 6.4
 */

/**
 * Error categories for classification
 */
export type ErrorCategory =
  | "network"        // Network connectivity issues
  | "wallet"         // Wallet connection/signing issues
  | "transaction"    // Transaction execution issues
  | "validation"     // Input validation issues
  | "rate_limit"     // Rate limiting issues
  | "timeout"        // Request timeout issues
  | "unknown";       // Unclassified errors

/**
 * Error severity levels
 */
export type ErrorSeverity = "info" | "warning" | "error" | "critical";

/**
 * Structured error with user-friendly messaging
 */
export interface AppError {
  code: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  actionableGuidance?: string;
  retryable: boolean;
  originalError?: Error;
  timestamp: number;
}

/**
 * Error code definitions with user-friendly messages
 */
export const ERROR_DEFINITIONS: Record<string, Omit<AppError, "originalError" | "timestamp">> = {
  // Network errors
  NETWORK_OFFLINE: {
    code: "NETWORK_OFFLINE",
    category: "network",
    severity: "error",
    message: "Network connection lost",
    userMessage: "You appear to be offline",
    actionableGuidance: "Please check your internet connection and try again.",
    retryable: true,
  },
  NETWORK_TIMEOUT: {
    code: "NETWORK_TIMEOUT",
    category: "timeout",
    severity: "warning",
    message: "Request timed out",
    userMessage: "The request took too long",
    actionableGuidance: "The network may be congested. Please wait a moment and try again.",
    retryable: true,
  },
  RPC_ERROR: {
    code: "RPC_ERROR",
    category: "network",
    severity: "error",
    message: "RPC provider error",
    userMessage: "Unable to connect to the blockchain",
    actionableGuidance: "The blockchain network may be experiencing issues. Try again in a few moments.",
    retryable: true,
  },

  // Wallet errors
  WALLET_NOT_CONNECTED: {
    code: "WALLET_NOT_CONNECTED",
    category: "wallet",
    severity: "warning",
    message: "Wallet not connected",
    userMessage: "Please connect your wallet",
    actionableGuidance: "Click the 'Connect Wallet' button to connect your wallet.",
    retryable: false,
  },
  WALLET_REJECTED: {
    code: "WALLET_REJECTED",
    category: "wallet",
    severity: "info",
    message: "User rejected the request",
    userMessage: "Transaction was cancelled",
    actionableGuidance: "You cancelled the transaction. Click 'Try Again' if you'd like to proceed.",
    retryable: false,
  },
  WRONG_NETWORK: {
    code: "WRONG_NETWORK",
    category: "wallet",
    severity: "warning",
    message: "Wrong network selected",
    userMessage: "Please switch to the correct network",
    actionableGuidance: "Click 'Switch Network' to change to the required network.",
    retryable: false,
  },
  INSUFFICIENT_FUNDS: {
    code: "INSUFFICIENT_FUNDS",
    category: "wallet",
    severity: "error",
    message: "Insufficient funds",
    userMessage: "You don't have enough funds",
    actionableGuidance: "Please ensure you have enough tokens and gas to complete this transaction.",
    retryable: false,
  },

  // Transaction errors
  TX_FAILED: {
    code: "TX_FAILED",
    category: "transaction",
    severity: "error",
    message: "Transaction failed",
    userMessage: "The transaction could not be completed",
    actionableGuidance: "The transaction was rejected by the network. Please check the details and try again.",
    retryable: true,
  },
  TX_REVERTED: {
    code: "TX_REVERTED",
    category: "transaction",
    severity: "error",
    message: "Transaction reverted",
    userMessage: "The transaction was reverted",
    actionableGuidance: "The smart contract rejected this transaction. This may be due to slippage or changed conditions.",
    retryable: true,
  },
  GAS_ESTIMATION_FAILED: {
    code: "GAS_ESTIMATION_FAILED",
    category: "transaction",
    severity: "warning",
    message: "Gas estimation failed",
    userMessage: "Unable to estimate transaction cost",
    actionableGuidance: "The transaction may fail. Please verify your inputs and try again.",
    retryable: true,
  },

  // Validation errors
  INVALID_INPUT: {
    code: "INVALID_INPUT",
    category: "validation",
    severity: "warning",
    message: "Invalid input",
    userMessage: "Please check your input",
    actionableGuidance: "One or more fields contain invalid values. Please correct them and try again.",
    retryable: false,
  },
  UNSUPPORTED_TOKEN: {
    code: "UNSUPPORTED_TOKEN",
    category: "validation",
    severity: "warning",
    message: "Token not supported",
    userMessage: "This token is not supported",
    actionableGuidance: "Please select a different token from the supported list.",
    retryable: false,
  },
  UNSUPPORTED_CHAIN: {
    code: "UNSUPPORTED_CHAIN",
    category: "validation",
    severity: "warning",
    message: "Chain not supported",
    userMessage: "This network is not supported",
    actionableGuidance: "Please select a supported network.",
    retryable: false,
  },

  // Rate limiting
  RATE_LIMITED: {
    code: "RATE_LIMITED",
    category: "rate_limit",
    severity: "warning",
    message: "Rate limit exceeded",
    userMessage: "Too many requests",
    actionableGuidance: "Please wait a moment before trying again.",
    retryable: true,
  },

  // Generic errors
  UNKNOWN_ERROR: {
    code: "UNKNOWN_ERROR",
    category: "unknown",
    severity: "error",
    message: "An unexpected error occurred",
    userMessage: "Something went wrong",
    actionableGuidance: "Please try again. If the problem persists, refresh the page.",
    retryable: true,
  },
};

/**
 * Create an AppError from an error code
 */
export function createAppError(
  code: keyof typeof ERROR_DEFINITIONS,
  originalError?: Error
): AppError {
  const definition = ERROR_DEFINITIONS[code] || ERROR_DEFINITIONS.UNKNOWN_ERROR;
  return {
    ...definition,
    originalError,
    timestamp: Date.now(),
  };
}

/**
 * Classify an error based on its message or type
 */
export function classifyError(error: Error | unknown): AppError {
  if (!(error instanceof Error)) {
    return createAppError("UNKNOWN_ERROR");
  }

  const message = error.message.toLowerCase();

  // Network errors
  if (message.includes("network") || message.includes("fetch") || message.includes("connection")) {
    if (message.includes("timeout") || message.includes("etimedout")) {
      return createAppError("NETWORK_TIMEOUT", error);
    }
    return createAppError("NETWORK_OFFLINE", error);
  }

  // Rate limiting
  if (message.includes("rate") || message.includes("429") || message.includes("too many")) {
    return createAppError("RATE_LIMITED", error);
  }

  // Wallet errors
  if (message.includes("user rejected") || message.includes("user denied") || message.includes("cancelled")) {
    return createAppError("WALLET_REJECTED", error);
  }
  if (message.includes("insufficient") || message.includes("not enough")) {
    return createAppError("INSUFFICIENT_FUNDS", error);
  }
  if (message.includes("wrong network") || message.includes("chain mismatch")) {
    return createAppError("WRONG_NETWORK", error);
  }

  // Transaction errors
  if (message.includes("reverted") || message.includes("revert")) {
    return createAppError("TX_REVERTED", error);
  }
  if (message.includes("gas") && message.includes("estimation")) {
    return createAppError("GAS_ESTIMATION_FAILED", error);
  }
  if (message.includes("transaction failed") || message.includes("tx failed")) {
    return createAppError("TX_FAILED", error);
  }

  // RPC errors
  if (message.includes("rpc") || message.includes("provider")) {
    return createAppError("RPC_ERROR", error);
  }

  return createAppError("UNKNOWN_ERROR", error);
}

/**
 * Exponential backoff configuration
 */
export interface BackoffConfig {
  initialDelayMs: number;
  maxDelayMs: number;
  maxRetries: number;
  backoffMultiplier: number;
  jitterFactor: number;
}

/**
 * Default backoff configuration
 */
export const DEFAULT_BACKOFF_CONFIG: BackoffConfig = {
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  maxRetries: 3,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
};

/**
 * Calculate delay for a given retry attempt with jitter
 */
export function calculateBackoffDelay(
  attempt: number,
  config: BackoffConfig = DEFAULT_BACKOFF_CONFIG
): number {
  const baseDelay = Math.min(
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelayMs
  );
  
  // Add jitter to prevent thundering herd
  const jitter = baseDelay * config.jitterFactor * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(baseDelay + jitter));
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry result type
 */
export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: AppError;
  attempts: number;
}

/**
 * Execute a function with exponential backoff retry
 * 
 * Requirements: 7.4
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<BackoffConfig> = {}
): Promise<RetryResult<T>> {
  const fullConfig = { ...DEFAULT_BACKOFF_CONFIG, ...config };
  let lastError: AppError | undefined;

  for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
    try {
      const result = await fn();
      return { success: true, data: result, attempts: attempt + 1 };
    } catch (error) {
      lastError = classifyError(error);
      
      // Don't retry non-retryable errors
      if (!lastError.retryable) {
        return { success: false, error: lastError, attempts: attempt + 1 };
      }

      // Don't wait after the last attempt
      if (attempt < fullConfig.maxRetries) {
        const delay = calculateBackoffDelay(attempt, fullConfig);
        await sleep(delay);
      }
    }
  }

  return { success: false, error: lastError, attempts: fullConfig.maxRetries + 1 };
}

/**
 * State recovery storage key prefix
 */
const STATE_RECOVERY_PREFIX = "defi-state-recovery-";

/**
 * Recoverable state interface
 */
export interface RecoverableState {
  id: string;
  type: "conversation" | "transaction" | "form";
  data: Record<string, unknown>;
  timestamp: number;
  expiresAt: number;
}

/**
 * State recovery expiration (1 hour)
 */
const STATE_RECOVERY_EXPIRATION_MS = 60 * 60 * 1000;

/**
 * Save state for recovery
 * 
 * Requirements: 6.4
 */
export function saveRecoverableState(
  type: RecoverableState["type"],
  data: Record<string, unknown>
): string {
  const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const state: RecoverableState = {
    id,
    type,
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + STATE_RECOVERY_EXPIRATION_MS,
  };

  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(`${STATE_RECOVERY_PREFIX}${id}`, JSON.stringify(state));
    }
  } catch {
    // localStorage may not be available or full
    console.warn("Failed to save recoverable state");
  }

  return id;
}

/**
 * Recover saved state
 * 
 * Requirements: 6.4
 */
export function recoverState(id: string): RecoverableState | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return null;
    }

    const stored = localStorage.getItem(`${STATE_RECOVERY_PREFIX}${id}`);
    if (!stored) return null;

    const state: RecoverableState = JSON.parse(stored);
    
    // Check if expired
    if (Date.now() > state.expiresAt) {
      localStorage.removeItem(`${STATE_RECOVERY_PREFIX}${id}`);
      return null;
    }

    return state;
  } catch {
    return null;
  }
}

/**
 * Clear recovered state
 */
export function clearRecoveredState(id: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.removeItem(`${STATE_RECOVERY_PREFIX}${id}`);
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Clear all expired recovery states
 */
export function cleanupExpiredStates(): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }

    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STATE_RECOVERY_PREFIX)) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const state: RecoverableState = JSON.parse(stored);
            if (Date.now() > state.expiresAt) {
              keysToRemove.push(key);
            }
          }
        } catch {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignore errors
  }
}

/**
 * Feature degradation status
 */
export interface FeatureStatus {
  available: boolean;
  degraded: boolean;
  message?: string;
}

/**
 * Check feature availability with graceful degradation
 * 
 * Requirements: 7.4
 */
export function checkFeatureAvailability(feature: string): FeatureStatus {
  // Check for required browser features
  const features: Record<string, () => FeatureStatus> = {
    localStorage: () => ({
      available: typeof window !== "undefined" && !!window.localStorage,
      degraded: false,
      message: "Local storage is not available. Some features may not persist.",
    }),
    webSocket: () => ({
      available: typeof WebSocket !== "undefined",
      degraded: false,
      message: "WebSocket is not available. Real-time updates may be limited.",
    }),
    crypto: () => ({
      available: typeof window !== "undefined" && !!window.crypto,
      degraded: false,
      message: "Crypto API is not available. Some security features may be limited.",
    }),
  };

  const checker = features[feature];
  if (!checker) {
    return { available: true, degraded: false };
  }

  return checker();
}

/**
 * Format error for display
 */
export function formatErrorForDisplay(error: AppError): {
  title: string;
  description: string;
  action?: string;
} {
  return {
    title: error.userMessage,
    description: error.actionableGuidance || "Please try again.",
    action: error.retryable ? "Try Again" : undefined,
  };
}
