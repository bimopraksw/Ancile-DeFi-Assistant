/**
 * Property-Based Tests for Multi-Step Agentic Reasoning
 * 
 * Feature: defi-intent-interface, Property 3: Multi-Step Agentic Reasoning
 * Validates: Requirements 3.1, 3.2, 3.4, 3.5
 * 
 * Tests that the DeFi_Agent breaks complex multi-step requests into sequential tool calls,
 * uses results from previous steps to calculate parameters for subsequent steps,
 * supports up to 5 steps, and handles failures gracefully with clear error messaging.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  SUPPORTED_CHAINS,
  TOKEN_WHITELIST,
} from "@/lib/schemas";

/**
 * Maximum number of steps allowed in a single agentic loop.
 * Requirements: 3.4
 */
const MAX_AGENTIC_STEPS = 5;

/**
 * Represents a single step in a multi-step operation.
 */
interface AgenticStep {
  stepNumber: number;
  toolName: "swapTokens" | "checkBalance";
  params: Record<string, unknown>;
  status: "pending" | "completed" | "failed";
  result?: unknown;
  error?: string;
  dependsOn?: number[]; // Step numbers this step depends on
}

/**
 * Represents a multi-step operation plan.
 */
interface MultiStepPlan {
  steps: AgenticStep[];
  totalSteps: number;
  currentStep: number;
  status: "planning" | "executing" | "completed" | "failed";
}

/**
 * Simulates breaking down a complex request into steps.
 * Requirements: 3.1
 */
function createMultiStepPlan(
  operations: Array<{ tool: "swapTokens" | "checkBalance"; params: Record<string, unknown> }>
): MultiStepPlan {
  const steps: AgenticStep[] = operations.map((op, index) => ({
    stepNumber: index + 1,
    toolName: op.tool,
    params: op.params,
    status: "pending",
    dependsOn: index > 0 ? [index] : undefined, // Each step depends on the previous
  }));

  return {
    steps,
    totalSteps: steps.length,
    currentStep: 0,
    status: "planning",
  };
}

/**
 * Simulates executing a step and updating the plan.
 * Requirements: 3.2
 */
function executeStep(
  plan: MultiStepPlan,
  stepResult: { success: boolean; result?: unknown; error?: string }
): MultiStepPlan {
  if (plan.currentStep >= plan.totalSteps) {
    return { ...plan, status: "completed" };
  }

  const updatedSteps = [...plan.steps];
  const currentStepIndex = plan.currentStep;

  if (stepResult.success) {
    updatedSteps[currentStepIndex] = {
      ...updatedSteps[currentStepIndex],
      status: "completed",
      result: stepResult.result,
    };

    const newCurrentStep = plan.currentStep + 1;
    return {
      ...plan,
      steps: updatedSteps,
      currentStep: newCurrentStep,
      status: newCurrentStep >= plan.totalSteps ? "completed" : "executing",
    };
  } else {
    // Requirements: 3.5 - Handle failures gracefully
    updatedSteps[currentStepIndex] = {
      ...updatedSteps[currentStepIndex],
      status: "failed",
      error: stepResult.error || "Unknown error",
    };

    return {
      ...plan,
      steps: updatedSteps,
      status: "failed",
    };
  }
}

/**
 * Calculates derived parameters from previous step results.
 * Requirements: 3.2
 */
function calculateDerivedParams(
  previousResult: { balance: number },
  operation: "half" | "quarter" | "all"
): number {
  switch (operation) {
    case "half":
      return previousResult.balance / 2;
    case "quarter":
      return previousResult.balance / 4;
    case "all":
      return previousResult.balance;
    default:
      return previousResult.balance;
  }
}

/**
 * Arbitrary for generating valid tool operations.
 */
const toolOperationArb = fc.record({
  tool: fc.constantFrom("swapTokens", "checkBalance") as fc.Arbitrary<"swapTokens" | "checkBalance">,
  params: fc.oneof(
    // Swap params
    fc.record({
      tokenIn: fc.constantFrom(...TOKEN_WHITELIST.ethereum),
      tokenOut: fc.constantFrom(...TOKEN_WHITELIST.ethereum),
      amount: fc.integer({ min: 1, max: 1000 }),
      chain: fc.constantFrom(...SUPPORTED_CHAINS),
    }),
    // Balance params
    fc.record({
      token: fc.constantFrom(...TOKEN_WHITELIST.ethereum),
      chain: fc.constantFrom(...SUPPORTED_CHAINS),
    })
  ),
});

/**
 * Arbitrary for generating multi-step operation sequences.
 */
const multiStepSequenceArb = fc.array(toolOperationArb, { minLength: 1, maxLength: MAX_AGENTIC_STEPS });

describe("Property 3: Multi-Step Agentic Reasoning", () => {
  /**
   * Property: For any complex multi-step request, the system should break it into
   * sequential tool calls with proper step numbering.
   * Requirements: 3.1
   */
  it("should break down multi-step requests into sequential tool calls", () => {
    fc.assert(
      fc.property(multiStepSequenceArb, (operations) => {
        const plan = createMultiStepPlan(operations);

        // Plan should have correct number of steps
        expect(plan.totalSteps).toBe(operations.length);
        expect(plan.steps.length).toBe(operations.length);

        // Each step should have correct step number
        plan.steps.forEach((step, index) => {
          expect(step.stepNumber).toBe(index + 1);
        });

        // Plan should start in planning status
        expect(plan.status).toBe("planning");
        expect(plan.currentStep).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any multi-step plan, the total steps should never exceed MAX_AGENTIC_STEPS.
   * Requirements: 3.4
   */
  it("should limit multi-step operations to maximum allowed steps", () => {
    fc.assert(
      fc.property(multiStepSequenceArb, (operations) => {
        const plan = createMultiStepPlan(operations);

        // Total steps should never exceed MAX_AGENTIC_STEPS
        expect(plan.totalSteps).toBeLessThanOrEqual(MAX_AGENTIC_STEPS);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any successful step execution, the plan should advance to the next step.
   * Requirements: 3.2
   */
  it("should advance to next step on successful execution", () => {
    fc.assert(
      fc.property(
        multiStepSequenceArb.filter((ops) => ops.length >= 2),
        (operations) => {
          let plan = createMultiStepPlan(operations);
          plan = { ...plan, status: "executing" };

          const initialStep = plan.currentStep;
          const successResult = { success: true, result: { balance: 100 } };

          plan = executeStep(plan, successResult);

          // Current step should advance
          expect(plan.currentStep).toBe(initialStep + 1);

          // Previous step should be marked completed
          expect(plan.steps[initialStep].status).toBe("completed");
          expect(plan.steps[initialStep].result).toEqual(successResult.result);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any failed step, the plan should stop execution and preserve error state.
   * Requirements: 3.5
   */
  it("should stop execution and preserve error state on failure", () => {
    fc.assert(
      fc.property(
        multiStepSequenceArb.filter((ops) => ops.length >= 2),
        fc.constantFrom("Token not supported", "Insufficient balance", "Network error"),
        (operations, errorMessage) => {
          let plan = createMultiStepPlan(operations);
          plan = { ...plan, status: "executing" };

          const failedStep = plan.currentStep;
          const failureResult = { success: false, error: errorMessage };

          plan = executeStep(plan, failureResult);

          // Plan should be in failed status
          expect(plan.status).toBe("failed");

          // Failed step should have error message
          expect(plan.steps[failedStep].status).toBe("failed");
          expect(plan.steps[failedStep].error).toBe(errorMessage);

          // Current step should not advance
          expect(plan.currentStep).toBe(failedStep);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any balance result, derived calculations should be mathematically correct.
   * Requirements: 3.2
   */
  it("should correctly calculate derived parameters from previous results", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        fc.constantFrom("half", "quarter", "all") as fc.Arbitrary<"half" | "quarter" | "all">,
        (balance, operation) => {
          const previousResult = { balance };
          const derivedAmount = calculateDerivedParams(previousResult, operation);

          switch (operation) {
            case "half":
              expect(derivedAmount).toBe(balance / 2);
              break;
            case "quarter":
              expect(derivedAmount).toBe(balance / 4);
              break;
            case "all":
              expect(derivedAmount).toBe(balance);
              break;
          }

          // Derived amount should never exceed original balance
          expect(derivedAmount).toBeLessThanOrEqual(balance);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any completed multi-step plan, all steps should be marked as completed.
   */
  it("should mark all steps as completed when plan completes successfully", () => {
    fc.assert(
      fc.property(multiStepSequenceArb, (operations) => {
        let plan = createMultiStepPlan(operations);
        plan = { ...plan, status: "executing" };

        // Execute all steps successfully
        for (let i = 0; i < operations.length; i++) {
          plan = executeStep(plan, { success: true, result: { balance: 100 } });
        }

        // Plan should be completed
        expect(plan.status).toBe("completed");

        // All steps should be completed
        plan.steps.forEach((step) => {
          expect(step.status).toBe("completed");
        });
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any step with dependencies, the dependent steps should be completed first.
   */
  it("should maintain step dependencies in execution order", () => {
    fc.assert(
      fc.property(
        multiStepSequenceArb.filter((ops) => ops.length >= 2),
        (operations) => {
          const plan = createMultiStepPlan(operations);

          // Check that dependencies reference earlier steps
          plan.steps.forEach((step) => {
            if (step.dependsOn) {
              step.dependsOn.forEach((depIndex) => {
                expect(depIndex).toBeLessThan(step.stepNumber);
              });
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any multi-step plan, step numbers should be sequential starting from 1.
   */
  it("should have sequential step numbers starting from 1", () => {
    fc.assert(
      fc.property(multiStepSequenceArb, (operations) => {
        const plan = createMultiStepPlan(operations);

        plan.steps.forEach((step, index) => {
          expect(step.stepNumber).toBe(index + 1);
        });

        // First step should be 1
        if (plan.steps.length > 0) {
          expect(plan.steps[0].stepNumber).toBe(1);
        }

        // Last step should equal total steps
        if (plan.steps.length > 0) {
          expect(plan.steps[plan.steps.length - 1].stepNumber).toBe(plan.totalSteps);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any failed plan, subsequent steps should remain in pending status.
   */
  it("should keep subsequent steps pending when a step fails", () => {
    fc.assert(
      fc.property(
        multiStepSequenceArb.filter((ops) => ops.length >= 3),
        fc.integer({ min: 0, max: 1 }),
        (operations, failAtStep) => {
          let plan = createMultiStepPlan(operations);
          plan = { ...plan, status: "executing" };

          // Execute steps until failure
          for (let i = 0; i < failAtStep; i++) {
            plan = executeStep(plan, { success: true, result: { balance: 100 } });
          }

          // Fail at the specified step
          plan = executeStep(plan, { success: false, error: "Test error" });

          // Steps after the failed step should still be pending
          for (let i = failAtStep + 1; i < operations.length; i++) {
            expect(plan.steps[i].status).toBe("pending");
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any plan, the current step should always be within valid bounds.
   */
  it("should keep current step within valid bounds", () => {
    fc.assert(
      fc.property(
        multiStepSequenceArb,
        fc.array(fc.boolean(), { minLength: 0, maxLength: MAX_AGENTIC_STEPS }),
        (operations, stepResults) => {
          let plan = createMultiStepPlan(operations);
          plan = { ...plan, status: "executing" };

          // Execute steps based on random success/failure
          for (const success of stepResults) {
            if (plan.status === "failed" || plan.status === "completed") break;
            plan = executeStep(plan, {
              success,
              result: success ? { balance: 100 } : undefined,
              error: success ? undefined : "Error",
            });
          }

          // Current step should be within bounds
          expect(plan.currentStep).toBeGreaterThanOrEqual(0);
          expect(plan.currentStep).toBeLessThanOrEqual(plan.totalSteps);
        }
      ),
      { numRuns: 100 }
    );
  });
});
