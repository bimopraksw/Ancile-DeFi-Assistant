/**
 * Security Module for DeFi Intent Interface
 * 
 * Provides comprehensive security measures including:
 * - Prompt injection detection and prevention
 * - Transaction validation before user presentation
 * - User approval requirements enforcement
 * - Malicious input detection
 * 
 * Requirements: 2.4, 4.2, 4.4, 7.3
 */

import { type Address } from "viem";

/**
 * Transaction approval state
 * Ensures no automatic transaction execution
 * 
 * Requirements: 2.4, 4.4
 */
export type ApprovalState = 
  | "pending_review"      // Transaction prepared, awaiting user review
  | "user_approved"       // User explicitly approved the transaction
  | "user_rejected"       // User explicitly rejected the transaction
  | "expired";            // Approval window expired

/**
 * Transaction approval record
 * Tracks user consent for each transaction
 */
export interface TransactionApproval {
  id: string;
  state: ApprovalState;
  createdAt: number;
  approvedAt?: number;
  rejectedAt?: number;
  expiresAt: number;
  transactionDetails: {
    type: "swap" | "transfer" | "approval";
    tokenIn?: string;
    tokenOut?: string;
    amount?: string;
    chain: string;
    to?: Address;
  };
}

/**
 * Approval expiration time in milliseconds (5 minutes)
 */
const APPROVAL_EXPIRATION_MS = 5 * 60 * 1000;

/**
 * Patterns that indicate potential prompt injection attempts.
 * These patterns are checked against user input to prevent malicious requests.
 * 
 * Requirements: 7.3
 */
export const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  // Instruction override attempts
  /ignore\s+(previous|all|above)\s+(instructions?|prompts?|rules?)/i,
  /disregard\s+(previous|all|above|everything)/i,
  /forget\s+(everything|all|previous|your\s+instructions?)/i,
  /override\s+(your\s+)?(instructions?|rules?|constraints?|security)/i,
  /bypass\s+(security|validation|checks?|rules?|restrictions?)/i,
  
  // System prompt manipulation
  /new\s+instructions?:/i,
  /system\s*:\s*/i,
  /\[system\]/i,
  /\[admin\]/i,
  /\[developer\]/i,
  /act\s+as\s+(if\s+)?(you\s+are\s+)?(a\s+)?different/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /you\s+are\s+now\s+a/i,
  
  // Direct address transfer attempts (potential theft)
  /transfer\s+(all\s+|everything\s+)?(my\s+)?(tokens?|funds?|assets?|balance)?\s*to\s+0x[a-fA-F0-9]{40}/i,
  /send\s+(all\s+|everything\s+)?(my\s+)?(tokens?|funds?|assets?|balance)?\s*to\s+0x[a-fA-F0-9]{40}/i,
  /withdraw\s+(all\s+|everything\s+)?(my\s+)?(tokens?|funds?|assets?|balance)?\s*to\s+0x[a-fA-F0-9]{40}/i,
  
  // Bulk asset transfer attempts
  /send\s+all\s+(my\s+)?(tokens?|funds?|assets?|balance)\s+to/i,
  /transfer\s+all\s+(my\s+)?(tokens?|funds?|assets?|balance)\s+to/i,
  /drain\s+(my\s+)?(wallet|account|funds?)/i,
  /empty\s+(my\s+)?(wallet|account)/i,
  
  // Role manipulation
  /you\s+must\s+obey/i,
  /do\s+not\s+refuse/i,
  /cannot\s+refuse/i,
  /must\s+comply/i,
  
  // Jailbreak attempts
  /jailbreak/i,
  /dan\s+mode/i,
  /developer\s+mode/i,
  /unrestricted\s+mode/i,
];

/**
 * Patterns for detecting potentially malicious addresses
 */
export const SUSPICIOUS_ADDRESS_PATTERNS: RegExp[] = [
  // Known scam address patterns (example patterns)
  /0x0{38}[0-9a-fA-F]{2}/i,  // Near-zero addresses
  /0x[dD][eE][aA][dD]/i,     // "dead" addresses
];

/**
 * Check if a message contains potential prompt injection attempts.
 * 
 * Requirements: 7.3
 */
export function containsPromptInjection(message: string): boolean {
  if (!message || typeof message !== "string") {
    return false;
  }
  return PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Detailed prompt injection detection result
 */
export interface InjectionDetectionResult {
  detected: boolean;
  patterns: string[];
  severity: "none" | "low" | "medium" | "high";
  message?: string;
}

/**
 * Detect prompt injection with detailed analysis
 * 
 * Requirements: 7.3
 */
export function detectPromptInjection(message: string): InjectionDetectionResult {
  if (!message || typeof message !== "string") {
    return { detected: false, patterns: [], severity: "none" };
  }

  const matchedPatterns: string[] = [];
  
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      matchedPatterns.push(pattern.source);
    }
  }

  if (matchedPatterns.length === 0) {
    return { detected: false, patterns: [], severity: "none" };
  }

  // Determine severity based on pattern types
  const hasAddressPattern = matchedPatterns.some(p => 
    p.includes("0x") || p.includes("transfer") || p.includes("send") || p.includes("drain")
  );
  const hasSystemPattern = matchedPatterns.some(p => 
    p.includes("system") || p.includes("admin") || p.includes("developer")
  );

  let severity: "low" | "medium" | "high" = "low";
  if (hasAddressPattern) {
    severity = "high";
  } else if (hasSystemPattern || matchedPatterns.length > 2) {
    severity = "medium";
  }

  return {
    detected: true,
    patterns: matchedPatterns,
    severity,
    message: severity === "high" 
      ? "Potential asset theft attempt detected. Request blocked for security."
      : "Suspicious input pattern detected. Please rephrase your request.",
  };
}

/**
 * Validate that a transaction requires explicit user approval
 * Returns false if the transaction would execute automatically
 * 
 * Requirements: 2.4, 4.4
 */
export function requiresUserApproval(approval: TransactionApproval): boolean {
  // Transaction must be in pending_review state initially
  if (approval.state !== "pending_review" && approval.state !== "user_approved") {
    return true;
  }
  
  // Check if approval has expired
  if (Date.now() > approval.expiresAt) {
    return true;
  }
  
  // Only allow execution if explicitly approved by user
  return approval.state !== "user_approved";
}

/**
 * Create a new transaction approval record
 * 
 * Requirements: 2.4
 */
export function createTransactionApproval(
  transactionDetails: TransactionApproval["transactionDetails"]
): TransactionApproval {
  const now = Date.now();
  return {
    id: `tx-${now}-${Math.random().toString(36).substr(2, 9)}`,
    state: "pending_review",
    createdAt: now,
    expiresAt: now + APPROVAL_EXPIRATION_MS,
    transactionDetails,
  };
}

/**
 * Approve a transaction (user action)
 * 
 * Requirements: 4.2
 */
export function approveTransaction(approval: TransactionApproval): TransactionApproval {
  if (Date.now() > approval.expiresAt) {
    return { ...approval, state: "expired" };
  }
  
  return {
    ...approval,
    state: "user_approved",
    approvedAt: Date.now(),
  };
}

/**
 * Reject a transaction (user action)
 */
export function rejectTransaction(approval: TransactionApproval): TransactionApproval {
  return {
    ...approval,
    state: "user_rejected",
    rejectedAt: Date.now(),
  };
}

/**
 * Check if an approval is still valid (not expired)
 */
export function isApprovalValid(approval: TransactionApproval): boolean {
  return Date.now() <= approval.expiresAt && approval.state !== "expired";
}

/**
 * Transaction validation result
 */
export interface TransactionValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate transaction parameters before presenting to user
 * 
 * Requirements: 7.3
 */
export function validateTransactionParams(params: {
  tokenIn?: string;
  tokenOut?: string;
  amount?: number | string;
  chain?: string;
  to?: string;
}): TransactionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate amount
  if (params.amount !== undefined) {
    const numAmount = typeof params.amount === "string" 
      ? parseFloat(params.amount) 
      : params.amount;
    
    if (isNaN(numAmount) || numAmount <= 0) {
      errors.push("Amount must be a positive number");
    }
    
    if (numAmount > 1e18) {
      warnings.push("Unusually large amount detected. Please verify.");
    }
  }

  // Validate address if provided
  if (params.to) {
    if (!isValidAddress(params.to)) {
      errors.push("Invalid destination address format");
    }
    
    if (isSuspiciousAddress(params.to)) {
      warnings.push("Destination address matches suspicious patterns. Please verify.");
    }
  }

  // Validate tokens are different for swaps
  if (params.tokenIn && params.tokenOut) {
    if (params.tokenIn.toUpperCase() === params.tokenOut.toUpperCase()) {
      errors.push("Cannot swap a token for itself");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if an address is valid Ethereum address format
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Check if an address matches suspicious patterns
 */
export function isSuspiciousAddress(address: string): boolean {
  return SUSPICIOUS_ADDRESS_PATTERNS.some((pattern) => pattern.test(address));
}

/**
 * Sanitize user input to remove potentially dangerous content
 * while preserving legitimate DeFi requests
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }
  
  // Remove null bytes and control characters (except newlines and tabs)
  let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  
  // Limit length to prevent DoS
  const MAX_INPUT_LENGTH = 2000;
  if (sanitized.length > MAX_INPUT_LENGTH) {
    sanitized = sanitized.substring(0, MAX_INPUT_LENGTH);
  }
  
  return sanitized.trim();
}

/**
 * Security audit log entry
 */
export interface SecurityAuditEntry {
  timestamp: number;
  type: "injection_attempt" | "validation_failure" | "approval_timeout" | "suspicious_address";
  severity: "low" | "medium" | "high";
  details: Record<string, unknown>;
}

/**
 * Create a security audit log entry
 */
export function createAuditEntry(
  type: SecurityAuditEntry["type"],
  severity: SecurityAuditEntry["severity"],
  details: Record<string, unknown>
): SecurityAuditEntry {
  return {
    timestamp: Date.now(),
    type,
    severity,
    details,
  };
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

/**
 * Default rate limit: 20 requests per minute
 */
export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 20,
  windowMs: 60 * 1000,
};

/**
 * Simple in-memory rate limiter
 * In production, use Redis or similar for distributed rate limiting
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig = DEFAULT_RATE_LIMIT) {
    this.config = config;
  }

  /**
   * Check if a request should be allowed
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    // Get existing requests for this identifier
    const existingRequests = this.requests.get(identifier) || [];
    
    // Filter to only requests within the window
    const recentRequests = existingRequests.filter((time) => time > windowStart);
    
    // Check if under limit
    if (recentRequests.length >= this.config.maxRequests) {
      return false;
    }
    
    // Add this request
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    
    return true;
  }

  /**
   * Get remaining requests for an identifier
   */
  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const existingRequests = this.requests.get(identifier) || [];
    const recentRequests = existingRequests.filter((time) => time > windowStart);
    return Math.max(0, this.config.maxRequests - recentRequests.length);
  }

  /**
   * Clear rate limit data for an identifier
   */
  clear(identifier: string): void {
    this.requests.delete(identifier);
  }

  /**
   * Clear all rate limit data
   */
  clearAll(): void {
    this.requests.clear();
  }
}
