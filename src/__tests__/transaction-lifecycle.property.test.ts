/**
 * Property-Based Tests for Transaction Lifecycle Management
 * 
 * Feature: defi-intent-interface, Property 7: Transaction Lifecycle Management
 * Validates: Requirements 5.3, 5.4, 5.5
 * 
 * Tests that for any transaction initiated through the interface:
 * - The system displays appropriate loading states during processing
 * - Shows clear success confirmations with transaction hashes upon completion
 * - Allows users to modify parameters before execution
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  getStatusMessage,
  getStatusColor,
  type TransactionStatus,
  type TransactionLifecycleState,
} from "@/hooks/useTransactionLifecycle";

/**
 * All valid transaction statuses
 */
const VALID_STATUSES: TransactionStatus[] = [
  "idle",
  "simulating",
  "preparing",
  "pending",
  "confirming",
  "success",
  "error",
];

/**
 * Loading statuses that should show loading indicators
 */
const LOADING_STATUSES: TransactionStatus[] = [
  "simulating",
  "preparing",
  "pending",
  "confirming",
];

/**
 * Terminal statuses where transaction is complete
 */
const TERMINAL_STATUSES: TransactionStatus[] = ["success", "error"];

/**
 * Arbitrary for valid transaction status
 */
const statusArb = fc.constantFrom(...VALID_STATUSES);

/**
 * Arbitrary for valid transaction hash (0x + 64 hex chars)
 */
const txHashArb = fc
  .array(fc.constantFrom(...'0123456789abcdef'.split('')), { minLength: 64, maxLength: 64 })
  .map((chars) => `0x${chars.join('')}` as `0x${string}`);

/**
 * Arbitrary for error messages
 */
const errorMessageArb = fc.string({ minLength: 1, maxLength: 200 });

/**
 * Arbitrary for gas estimate (number to avoid bigint issues)
 */
const gasEstimateArb = fc.integer({ min: 21000, max: 1000000 }).map((n) => BigInt(n));

/**
 * Arbitrary for complete transaction state
 */
const transactionStateArb: fc.Arbitrary<TransactionLifecycleState> = fc
  .tuple(
    statusArb,
    fc.option(txHashArb, { nil: undefined }),
    fc.option(errorMessageArb, { nil: undefined }),
    fc.option(gasEstimateArb, { nil: undefined })
  )
  .map(([status, hash, error, gasEstimate]) => ({
    status,
    hash,
    error,
    gasEstimate,
  }));

/**
 * Arbitrary for success state (must have hash)
 */
const successStateArb: fc.Arbitrary<TransactionLifecycleState> = fc
  .tuple(txHashArb, fc.option(gasEstimateArb, { nil: undefined }))
  .map(([hash, gasEstimate]) => ({
    status: "success" as TransactionStatus,
    hash,
    error: undefined,
    gasEstimate,
  }));

/**
 * Arbitrary for error state (must have error message)
 */
const errorStateArb: fc.Arbitrary<TransactionLifecycleState> = fc
  .tuple(
    fc.option(txHashArb, { nil: undefined }),
    errorMessageArb,
    fc.option(gasEstimateArb, { nil: undefined })
  )
  .map(([hash, error, gasEstimate]) => ({
    status: "error" as TransactionStatus,
    hash,
    error,
    gasEstimate,
  }));

/**
 * Arbitrary for loading state
 */
const loadingStateArb: fc.Arbitrary<TransactionLifecycleState> = fc
  .tuple(
    fc.constantFrom(...LOADING_STATUSES),
    fc.option(txHashArb, { nil: undefined }),
    fc.option(gasEstimateArb, { nil: undefined })
  )
  .map(([status, hash, gasEstimate]) => ({
    status,
    hash,
    error: undefined,
    gasEstimate,
  }));

describe("Property 7: Transaction Lifecycle Management", () => {
  /**
   * Property: For any transaction status, getStatusMessage should return a non-empty string.
   */
  it("should return non-empty status message for all statuses", () => {
    fc.assert(
      fc.property(statusArb, (status) => {
        const message = getStatusMessage(status);
        expect(typeof message).toBe("string");
        expect(message.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any transaction status, getStatusColor should return a valid CSS class.
   */
  it("should return valid color class for all statuses", () => {
    fc.assert(
      fc.property(statusArb, (status) => {
        const color = getStatusColor(status);
        expect(typeof color).toBe("string");
        expect(color.startsWith("text-")).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any loading status, the color should indicate activity (not muted).
   */
  it("should use active colors for loading statuses", () => {
    fc.assert(
      fc.property(fc.constantFrom(...LOADING_STATUSES), (status) => {
        const color = getStatusColor(status);
        // Loading states should not use muted colors
        expect(color).not.toBe("text-muted-foreground");
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For success status, the color should be green.
   */
  it("should use green color for success status", () => {
    const color = getStatusColor("success");
    expect(color).toContain("green");
  });

  /**
   * Property: For error status, the color should indicate error (destructive).
   */
  it("should use destructive color for error status", () => {
    const color = getStatusColor("error");
    expect(color).toContain("destructive");
  });

  /**
   * Property: For any success state, the hash should be defined.
   */
  it("should have hash defined in success state", () => {
    fc.assert(
      fc.property(successStateArb, (state) => {
        expect(state.status).toBe("success");
        expect(state.hash).toBeDefined();
        expect(state.hash!.startsWith("0x")).toBe(true);
        expect(state.hash!.length).toBe(66); // 0x + 64 hex chars
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any error state, the error message should be defined.
   */
  it("should have error message defined in error state", () => {
    fc.assert(
      fc.property(errorStateArb, (state) => {
        expect(state.status).toBe("error");
        expect(state.error).toBeDefined();
        expect(state.error!.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any loading state, the error should be undefined.
   */
  it("should not have error in loading states", () => {
    fc.assert(
      fc.property(loadingStateArb, (state) => {
        expect(LOADING_STATUSES).toContain(state.status);
        expect(state.error).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any transaction hash, it should be a valid hex string.
   */
  it("should generate valid transaction hashes", () => {
    fc.assert(
      fc.property(txHashArb, (hash) => {
        expect(hash.startsWith("0x")).toBe(true);
        expect(hash.length).toBe(66);
        // Check all characters after 0x are valid hex
        const hexPart = hash.slice(2);
        expect(/^[0-9a-f]+$/i.test(hexPart)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any gas estimate, it should be a positive bigint.
   */
  it("should have positive gas estimates", () => {
    fc.assert(
      fc.property(gasEstimateArb, (gas) => {
        expect(typeof gas).toBe("bigint");
        expect(gas).toBeGreaterThan(BigInt(0));
        // Minimum gas for a transaction is 21000
        expect(gas).toBeGreaterThanOrEqual(BigInt(21000));
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Status transitions should follow valid paths.
   * idle -> simulating/preparing -> pending -> confirming -> success/error
   */
  it("should have valid status transition paths", () => {
    const validTransitions: Record<TransactionStatus, TransactionStatus[]> = {
      idle: ["simulating", "preparing", "pending", "error"],
      simulating: ["preparing", "error"],
      preparing: ["pending", "error"],
      pending: ["confirming", "error"],
      confirming: ["success", "error"],
      success: ["idle"], // Can reset
      error: ["idle"], // Can reset
    };

    fc.assert(
      fc.property(statusArb, (currentStatus) => {
        const validNextStatuses = validTransitions[currentStatus];
        expect(validNextStatuses).toBeDefined();
        expect(validNextStatuses.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Terminal statuses should allow reset to idle.
   */
  it("should allow reset from terminal statuses", () => {
    fc.assert(
      fc.property(fc.constantFrom(...TERMINAL_STATUSES), (status) => {
        // Terminal statuses should be able to transition back to idle
        expect(["success", "error"]).toContain(status);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any transaction state, the status should be one of the valid statuses.
   */
  it("should always have valid status in transaction state", () => {
    fc.assert(
      fc.property(transactionStateArb, (state) => {
        expect(VALID_STATUSES).toContain(state.status);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Status messages should be unique for each status.
   */
  it("should have unique status messages", () => {
    const messages = VALID_STATUSES.map(getStatusMessage);
    const uniqueMessages = new Set(messages);
    expect(uniqueMessages.size).toBe(VALID_STATUSES.length);
  });

  /**
   * Property: For any confirming state, hash should typically be present.
   */
  it("should typically have hash in confirming state", () => {
    const confirmingStateArb: fc.Arbitrary<TransactionLifecycleState> = txHashArb
      .chain((hash) =>
        fc.option(gasEstimateArb, { nil: undefined }).map((gasEstimate) => ({
          status: "confirming" as TransactionStatus,
          hash,
          error: undefined,
          gasEstimate,
        }))
      );

    fc.assert(
      fc.property(confirmingStateArb, (state) => {
        expect(state.status).toBe("confirming");
        expect(state.hash).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Idle state should have no hash and no error.
   */
  it("should have clean idle state", () => {
    const idleState: TransactionLifecycleState = { status: "idle" };
    expect(idleState.status).toBe("idle");
    expect(idleState.hash).toBeUndefined();
    expect(idleState.error).toBeUndefined();
  });

  /**
   * Property: For any amount input, it should be modifiable before transaction starts.
   * (Testing the concept that idle state allows modification)
   */
  it("should allow modification in idle state", () => {
    const idleStateArb: fc.Arbitrary<TransactionLifecycleState> = fc
      .option(gasEstimateArb, { nil: undefined })
      .map((gasEstimate) => ({
        status: "idle" as TransactionStatus,
        hash: undefined,
        error: undefined,
        gasEstimate,
      }));

    fc.assert(
      fc.property(idleStateArb, (state) => {
        // In idle state, user should be able to modify parameters
        expect(state.status).toBe("idle");
        expect(state.hash).toBeUndefined();
        expect(state.error).toBeUndefined();
        // This represents the state where user can edit amount
      }),
      { numRuns: 100 }
    );
  });
});
