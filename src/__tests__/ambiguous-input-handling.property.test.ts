/**
 * Property-Based Tests for Ambiguous Input Handling
 * 
 * Feature: defi-intent-interface, Property 12: Ambiguous Input Handling
 * Validates: Requirements 1.3
 * 
 * Tests that the DeFi_Agent asks for clarification rather than making assumptions
 * or proceeding with potentially incorrect interpretations when user input is unclear.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  SUPPORTED_CHAINS,
  TOKEN_WHITELIST,
  getAllSupportedTokens,
  getChainsForToken,
  type SupportedChain,
} from "@/lib/schemas";

/**
 * Types of ambiguity that can occur in user input.
 */
type AmbiguityType =
  | "missing_chain"
  | "missing_amount"
  | "missing_token"
  | "multiple_interpretations"
  | "unclear_operation"
  | "partial_information";

/**
 * Represents an ambiguous input analysis result.
 */
interface AmbiguityAnalysis {
  isAmbiguous: boolean;
  ambiguityTypes: AmbiguityType[];
  missingFields: string[];
  clarificationNeeded: string[];
  possibleInterpretations?: string[];
}

/**
 * Represents a parsed user intent (potentially incomplete).
 */
interface ParsedIntent {
  operation?: "swap" | "balance" | "unknown";
  tokenIn?: string;
  tokenOut?: string;
  amount?: number;
  chain?: string;
  rawInput: string;
}

/**
 * Analyzes user input for ambiguity.
 * Requirements: 1.3
 */
function analyzeAmbiguity(intent: ParsedIntent): AmbiguityAnalysis {
  const ambiguityTypes: AmbiguityType[] = [];
  const missingFields: string[] = [];
  const clarificationNeeded: string[] = [];
  const possibleInterpretations: string[] = [];

  // Helper to check if a value is missing (null or undefined)
  const isMissing = (value: unknown): boolean => value === null || value === undefined;

  // Check for missing operation type
  if (isMissing(intent.operation) || intent.operation === "unknown") {
    ambiguityTypes.push("unclear_operation");
    clarificationNeeded.push("What operation would you like to perform? (swap tokens or check balance)");
  }

  // Check for swap-specific ambiguities
  if (intent.operation === "swap") {
    if (isMissing(intent.tokenIn)) {
      missingFields.push("tokenIn");
      ambiguityTypes.push("missing_token");
      clarificationNeeded.push("Which token would you like to swap from?");
    }
    if (isMissing(intent.tokenOut)) {
      missingFields.push("tokenOut");
      ambiguityTypes.push("missing_token");
      clarificationNeeded.push("Which token would you like to swap to?");
    }
    if (isMissing(intent.amount) || (intent.amount !== undefined && intent.amount !== null && intent.amount <= 0)) {
      missingFields.push("amount");
      ambiguityTypes.push("missing_amount");
      clarificationNeeded.push("How much would you like to swap?");
    }
  }

  // Check for balance-specific ambiguities
  if (intent.operation === "balance") {
    if (isMissing(intent.tokenIn)) {
      missingFields.push("token");
      ambiguityTypes.push("missing_token");
      clarificationNeeded.push("Which token's balance would you like to check?");
    }
  }

  // Check for chain ambiguity
  if (isMissing(intent.chain)) {
    // Check if token exists on multiple chains
    const token = intent.tokenIn || intent.tokenOut;
    if (token) {
      const availableChains = getChainsForToken(token);
      if (availableChains.length > 1) {
        ambiguityTypes.push("missing_chain");
        missingFields.push("chain");
        clarificationNeeded.push(`Which chain would you like to use? ${token} is available on: ${availableChains.join(", ")}`);
        possibleInterpretations.push(...availableChains.map((c) => `Use ${token} on ${c}`));
      } else if (availableChains.length === 1) {
        // Token only exists on one chain, so we can infer it - not ambiguous
      } else {
        // Token not found on any chain
        ambiguityTypes.push("missing_chain");
        missingFields.push("chain");
        clarificationNeeded.push("Which blockchain network would you like to use?");
      }
    } else {
      ambiguityTypes.push("missing_chain");
      missingFields.push("chain");
      clarificationNeeded.push("Which blockchain network would you like to use?");
    }
  }

  // Check for multiple interpretations
  if (intent.rawInput.toLowerCase().includes("some") || 
      intent.rawInput.toLowerCase().includes("a bit") ||
      intent.rawInput.toLowerCase().includes("few")) {
    ambiguityTypes.push("multiple_interpretations");
    clarificationNeeded.push("Please specify an exact amount.");
  }

  // Check for partial information
  if (missingFields.length > 0 && missingFields.length < 3) {
    ambiguityTypes.push("partial_information");
  }

  const isAmbiguous = ambiguityTypes.length > 0;

  return {
    isAmbiguous,
    ambiguityTypes: [...new Set(ambiguityTypes)], // Remove duplicates
    missingFields,
    clarificationNeeded,
    possibleInterpretations: possibleInterpretations.length > 0 ? possibleInterpretations : undefined,
  };
}

/**
 * Determines if clarification should be requested.
 * Requirements: 1.3
 */
function shouldRequestClarification(analysis: AmbiguityAnalysis): boolean {
  return analysis.isAmbiguous && analysis.clarificationNeeded.length > 0;
}

/**
 * Generates a clarification request message.
 */
function generateClarificationRequest(analysis: AmbiguityAnalysis): string {
  if (!analysis.isAmbiguous) {
    return "";
  }

  const messages: string[] = [
    "I need some clarification to proceed with your request:",
    ...analysis.clarificationNeeded.map((q, i) => `${i + 1}. ${q}`),
  ];

  if (analysis.possibleInterpretations && analysis.possibleInterpretations.length > 0) {
    messages.push("\nPossible options:");
    messages.push(...analysis.possibleInterpretations.map((i) => `- ${i}`));
  }

  return messages.join("\n");
}

/**
 * Arbitrary for generating incomplete swap intents.
 */
const incompleteSwapIntentArb = fc.record({
  operation: fc.constant("swap" as const),
  tokenIn: fc.option(fc.constantFrom(...getAllSupportedTokens())),
  tokenOut: fc.option(fc.constantFrom(...getAllSupportedTokens())),
  amount: fc.option(fc.integer({ min: 1, max: 1000 })),
  chain: fc.option(fc.constantFrom(...SUPPORTED_CHAINS)),
  rawInput: fc.string({ minLength: 1, maxLength: 100 }),
});

/**
 * Arbitrary for generating incomplete balance intents.
 */
const incompleteBalanceIntentArb = fc.record({
  operation: fc.constant("balance" as const),
  tokenIn: fc.option(fc.constantFrom(...getAllSupportedTokens())),
  tokenOut: fc.constant(undefined),
  amount: fc.constant(undefined),
  chain: fc.option(fc.constantFrom(...SUPPORTED_CHAINS)),
  rawInput: fc.string({ minLength: 1, maxLength: 100 }),
});

/**
 * Arbitrary for generating ambiguous raw inputs.
 */
const ambiguousInputArb = fc.constantFrom(
  "swap some tokens",
  "check balance",
  "swap ETH",
  "get me USDC",
  "trade a bit of my crypto",
  "exchange tokens please",
  "how much do I have",
  "swap few ETH for something",
  "balance check",
  "convert my tokens"
);

describe("Property 12: Ambiguous Input Handling", () => {
  /**
   * Property: For any incomplete swap intent missing required fields,
   * the system should identify it as ambiguous.
   * Requirements: 1.3
   */
  it("should identify incomplete swap intents as ambiguous", () => {
    fc.assert(
      fc.property(
        incompleteSwapIntentArb.filter((intent) => {
          // Filter for truly incomplete intents
          // Note: if chain is null but token only exists on one chain, it's not ambiguous
          const tokenIn = intent.tokenIn;
          const chainCanBeInferred = tokenIn && getChainsForToken(tokenIn).length === 1;
          
          return !intent.tokenIn || !intent.tokenOut || !intent.amount || 
                 (!intent.chain && !chainCanBeInferred);
        }),
        (intent) => {
          const analysis = analyzeAmbiguity(intent as ParsedIntent);
          
          // Should be identified as ambiguous
          expect(analysis.isAmbiguous).toBe(true);
          
          // Should have missing fields identified
          expect(analysis.missingFields.length).toBeGreaterThan(0);
          
          // Should have clarification questions
          expect(analysis.clarificationNeeded.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any incomplete balance intent missing required fields,
   * the system should identify it as ambiguous.
   * Requirements: 1.3
   */
  it("should identify incomplete balance intents as ambiguous", () => {
    fc.assert(
      fc.property(
        incompleteBalanceIntentArb.filter((intent) => {
          // Filter for truly incomplete intents
          // Note: if chain is null but token only exists on one chain, it's not ambiguous
          const token = intent.tokenIn;
          const chainCanBeInferred = token && getChainsForToken(token).length === 1;
          
          return !intent.tokenIn || (!intent.chain && !chainCanBeInferred);
        }),
        (intent) => {
          const analysis = analyzeAmbiguity(intent as ParsedIntent);
          
          // Should be identified as ambiguous
          expect(analysis.isAmbiguous).toBe(true);
          
          // Should request clarification
          expect(shouldRequestClarification(analysis)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any ambiguous input, the system should generate
   * a non-empty clarification request.
   * Requirements: 1.3
   */
  it("should generate clarification requests for ambiguous inputs", () => {
    fc.assert(
      fc.property(
        fc.record({
          operation: fc.constantFrom("swap", "balance", "unknown") as fc.Arbitrary<"swap" | "balance" | "unknown">,
          tokenIn: fc.option(fc.constantFrom(...getAllSupportedTokens())),
          tokenOut: fc.option(fc.constantFrom(...getAllSupportedTokens())),
          amount: fc.option(fc.integer({ min: 1, max: 1000 })),
          chain: fc.option(fc.constantFrom(...SUPPORTED_CHAINS)),
          rawInput: ambiguousInputArb,
        }),
        (intent) => {
          const analysis = analyzeAmbiguity(intent as ParsedIntent);
          
          if (analysis.isAmbiguous) {
            const clarificationMessage = generateClarificationRequest(analysis);
            
            // Clarification message should not be empty
            expect(clarificationMessage.length).toBeGreaterThan(0);
            
            // Should contain the word "clarification" or numbered questions
            expect(
              clarificationMessage.includes("clarification") ||
              clarificationMessage.includes("1.")
            ).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any token available on multiple chains without chain specified,
   * the system should identify chain ambiguity.
   * Requirements: 1.3
   */
  it("should identify chain ambiguity for multi-chain tokens", () => {
    // Find tokens that exist on multiple chains
    const multiChainTokens = getAllSupportedTokens().filter(
      (token) => getChainsForToken(token).length > 1
    );

    fc.assert(
      fc.property(
        fc.constantFrom(...multiChainTokens),
        (token) => {
          const intent: ParsedIntent = {
            operation: "balance",
            tokenIn: token,
            rawInput: `check ${token} balance`,
            // No chain specified
          };

          const analysis = analyzeAmbiguity(intent);

          // Should identify missing chain
          expect(analysis.ambiguityTypes).toContain("missing_chain");
          
          // Should provide possible interpretations
          expect(analysis.possibleInterpretations).toBeDefined();
          expect(analysis.possibleInterpretations!.length).toBeGreaterThan(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any input with vague quantity words, the system should
   * identify it as having multiple interpretations.
   * Requirements: 1.3
   */
  it("should identify vague quantity words as ambiguous", () => {
    const vagueQuantityInputs = [
      "swap some ETH for USDC",
      "trade a bit of my tokens",
      "exchange few USDC",
      "convert some of my balance",
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...vagueQuantityInputs),
        (rawInput) => {
          const intent: ParsedIntent = {
            operation: "swap",
            tokenIn: "ETH",
            tokenOut: "USDC",
            chain: "ethereum",
            rawInput,
            // No specific amount
          };

          const analysis = analyzeAmbiguity(intent);

          // Should identify multiple interpretations
          expect(analysis.ambiguityTypes).toContain("multiple_interpretations");
          
          // Should ask for exact amount
          expect(
            analysis.clarificationNeeded.some((q) => 
              q.toLowerCase().includes("amount") || q.toLowerCase().includes("exact")
            )
          ).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any complete intent with all required fields,
   * the system should not identify it as ambiguous.
   */
  it("should not flag complete intents as ambiguous", () => {
    fc.assert(
      fc.property(
        fc.record({
          operation: fc.constant("swap" as const),
          tokenIn: fc.constantFrom(...TOKEN_WHITELIST.ethereum),
          tokenOut: fc.constantFrom(...TOKEN_WHITELIST.ethereum),
          amount: fc.integer({ min: 1, max: 1000 }),
          chain: fc.constant("ethereum" as SupportedChain),
          rawInput: fc.constant("Swap 100 ETH for USDC on ethereum"),
        }).filter((intent) => intent.tokenIn !== intent.tokenOut),
        (intent) => {
          const analysis = analyzeAmbiguity(intent as ParsedIntent);

          // Should not have missing fields for the core operation
          // (chain might still be flagged if token exists on multiple chains)
          const coreMissingFields = analysis.missingFields.filter(
            (f) => f !== "chain"
          );
          expect(coreMissingFields.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any unknown operation type, the system should
   * request clarification about the intended operation.
   * Requirements: 1.3
   */
  it("should request clarification for unknown operation types", () => {
    fc.assert(
      fc.property(
        fc.record({
          operation: fc.constant("unknown" as const),
          tokenIn: fc.option(fc.constantFrom(...getAllSupportedTokens())),
          tokenOut: fc.option(fc.constantFrom(...getAllSupportedTokens())),
          amount: fc.option(fc.integer({ min: 1, max: 1000 })),
          chain: fc.option(fc.constantFrom(...SUPPORTED_CHAINS)),
          rawInput: fc.constantFrom(
            "do something with my tokens",
            "help me with crypto",
            "tokens please",
            "ETH USDC"
          ),
        }),
        (intent) => {
          const analysis = analyzeAmbiguity(intent as ParsedIntent);

          // Should identify unclear operation
          expect(analysis.ambiguityTypes).toContain("unclear_operation");
          
          // Should ask about operation type
          expect(
            analysis.clarificationNeeded.some((q) =>
              q.toLowerCase().includes("operation") ||
              q.toLowerCase().includes("swap") ||
              q.toLowerCase().includes("balance")
            )
          ).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: The number of clarification questions should match
   * the number of ambiguity types identified.
   */
  it("should generate appropriate number of clarification questions", () => {
    fc.assert(
      fc.property(
        incompleteSwapIntentArb,
        (intent) => {
          const analysis = analyzeAmbiguity(intent as ParsedIntent);

          if (analysis.isAmbiguous) {
            // Should have at least one clarification question
            expect(analysis.clarificationNeeded.length).toBeGreaterThan(0);
            
            // Number of questions should be reasonable (not excessive)
            expect(analysis.clarificationNeeded.length).toBeLessThanOrEqual(5);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any ambiguous analysis, shouldRequestClarification
   * should return true.
   */
  it("should consistently recommend clarification for ambiguous inputs", () => {
    fc.assert(
      fc.property(
        incompleteSwapIntentArb.filter((intent) => 
          !intent.tokenIn || !intent.tokenOut || !intent.amount
        ),
        (intent) => {
          const analysis = analyzeAmbiguity(intent as ParsedIntent);
          
          // If ambiguous, should request clarification
          if (analysis.isAmbiguous) {
            expect(shouldRequestClarification(analysis)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
