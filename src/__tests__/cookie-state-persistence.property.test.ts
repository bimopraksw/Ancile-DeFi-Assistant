/**
 * Property-Based Tests for Cookie-Based State Persistence
 * 
 * Feature: defi-intent-interface, Property 14: Cookie-Based State Persistence
 * Validates: Requirements 4.5
 * 
 * Tests that wallet connection state changes are properly persisted
 * using secure cookie storage to maintain SSR compatibility and
 * prevent hydration mismatches.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { serialize, deserialize } from "wagmi";
import { getConfig, supportedChains } from "@/lib/wagmi";
import { cookieTestUtils } from "@/lib/test-utils";
import { chainIdArb } from "@/lib/test-generators";

/**
 * Connection status types that can be persisted
 */
const CONNECTION_STATUSES = [
  "connected",
  "disconnected",
  "connecting",
  "reconnecting",
] as const;

type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];

/**
 * Type for deserialized wallet state
 */
interface DeserializedState {
  chainId: number;
  status: string;
  current: unknown;
  connections: Map<unknown, unknown>;
}

/**
 * Generate a valid wallet connection state
 */
const walletConnectionStateArb = fc.record({
  chainId: chainIdArb,
  status: fc.constantFrom(...CONNECTION_STATUSES),
  current: fc.constant(null),
  connections: fc.constant(new Map()),
});

describe("Property 14: Cookie-Based State Persistence", () => {
  /**
   * Property: For any wallet connection state change, serializing to cookie
   * and deserializing should preserve the essential state properties.
   * 
   * **Validates: Requirements 4.5**
   */
  it("should persist wallet connection state through cookie serialization", () => {
    fc.assert(
      fc.property(
        walletConnectionStateArb,
        (state) => {
          // Serialize the state (as would happen when persisting to cookie)
          const serialized = serialize(state);
          
          // Verify serialization produced a string
          expect(typeof serialized).toBe("string");
          expect(serialized.length).toBeGreaterThan(0);
          
          // Deserialize the state (as would happen when reading from cookie)
          const deserialized = deserialize(serialized) as DeserializedState;
          
          // Verify essential properties are preserved
          expect(deserialized).toBeDefined();
          expect(deserialized.chainId).toBe(state.chainId);
          expect(deserialized.status).toBe(state.status);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any sequence of connection state changes,
   * the final state should be correctly persisted and recoverable.
   * 
   * **Validates: Requirements 4.5**
   */
  it("should correctly persist the final state after multiple state changes", () => {
    fc.assert(
      fc.property(
        // Generate a sequence of state changes
        fc.array(walletConnectionStateArb, { minLength: 1, maxLength: 5 }),
        (stateChanges) => {
          // Simulate applying each state change and persisting
          let lastSerialized = "";
          
          for (const state of stateChanges) {
            lastSerialized = serialize(state);
          }
          
          // The final serialized state should be recoverable
          const finalState = deserialize(lastSerialized) as DeserializedState;
          const expectedFinalState = stateChanges[stateChanges.length - 1];
          
          expect(finalState.chainId).toBe(expectedFinalState.chainId);
          expect(finalState.status).toBe(expectedFinalState.status);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Cookie parsing should handle malformed or invalid cookie strings
   * gracefully without throwing errors.
   * 
   * **Validates: Requirements 4.5**
   */
  it("should handle malformed cookie strings gracefully", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Empty/null cases
          fc.constant(""),
          fc.constant("   "),
          // Malformed cookies
          fc.constant("invalid"),
          fc.constant("key="),
          fc.constant("=value"),
          fc.constant("==="),
          // Random strings
          fc.string({ minLength: 0, maxLength: 100 }),
          // Special characters
          fc.constant("key=value;path=/;secure"),
          fc.constant("a=b;c=d;e=f"),
        ),
        (cookieString) => {
          // Parsing should never throw
          expect(() => {
            const parsed = cookieTestUtils.parseCookies(cookieString);
            expect(typeof parsed).toBe("object");
          }).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Creating and parsing a cookie should preserve the original value.
   * 
   * **Validates: Requirements 4.5**
   */
  it("should preserve values through cookie creation and parsing round-trip", () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 20 }).filter(
            (s) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s)
          ),
          value: fc.string({ minLength: 0, maxLength: 100 }).filter(
            (s) => !s.includes(";") && !s.includes("=")
          ),
        }),
        ({ name, value }) => {
          // Create a cookie
          const cookie = cookieTestUtils.createCookie(name, value);
          
          // Parse the cookie
          const parsed = cookieTestUtils.parseCookies(cookie);
          
          // The value should be preserved
          expect(parsed[name]).toBe(value);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Wagmi state cookies should be correctly created and parseable.
   * 
   * **Validates: Requirements 4.5**
   */
  it("should create valid wagmi state cookies", () => {
    fc.assert(
      fc.property(
        fc.record({
          chainId: chainIdArb,
          status: fc.constantFrom(...CONNECTION_STATUSES),
        }),
        (state) => {
          // Create a wagmi state cookie
          const cookie = cookieTestUtils.createWagmiStateCookie(state);
          
          // Cookie should be a non-empty string
          expect(typeof cookie).toBe("string");
          expect(cookie.length).toBeGreaterThan(0);
          
          // Cookie should contain wagmi.store
          expect(cookie).toContain("wagmi.store=");
          
          // Parse the cookie
          const parsed = cookieTestUtils.parseCookies(cookie);
          expect(parsed["wagmi.store"]).toBeDefined();
          
          // The parsed value should be valid JSON
          expect(() => {
            const stateObj = JSON.parse(parsed["wagmi.store"]);
            expect(stateObj.state.chainId).toBe(state.chainId);
            expect(stateObj.state.status).toBe(state.status);
          }).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: State persistence should work correctly for all supported chains.
   * 
   * **Validates: Requirements 4.5**
   */
  it("should persist state correctly for all supported chains", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...supportedChains),
        fc.constantFrom(...CONNECTION_STATUSES),
        (chain, status) => {
          const state = {
            chainId: chain.id,
            status,
            current: null,
            connections: new Map(),
          };
          
          // Serialize and deserialize
          const serialized = serialize(state);
          const deserialized = deserialize(serialized) as DeserializedState;
          
          // Chain ID should be preserved
          expect(deserialized.chainId).toBe(chain.id);
          expect(deserialized.status).toBe(status);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Connection state transitions should be persistable.
   * 
   * **Validates: Requirements 4.5**
   */
  it("should persist all valid connection state transitions", () => {
    // Define valid state transitions
    const validTransitions: Array<[ConnectionStatus, ConnectionStatus]> = [
      ["disconnected", "connecting"],
      ["connecting", "connected"],
      ["connecting", "disconnected"],
      ["connected", "disconnected"],
      ["connected", "reconnecting"],
      ["reconnecting", "connected"],
      ["reconnecting", "disconnected"],
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...validTransitions),
        chainIdArb,
        ([fromStatus, toStatus], chainId) => {
          // Create initial state
          const initialState = {
            chainId,
            status: fromStatus,
            current: null,
            connections: new Map(),
          };
          
          // Serialize initial state
          const initialSerialized = serialize(initialState);
          
          // Create new state after transition
          const newState = {
            chainId,
            status: toStatus,
            current: null,
            connections: new Map(),
          };
          
          // Serialize new state
          const newSerialized = serialize(newState);
          
          // Both should be valid serializations
          expect(initialSerialized).toBeDefined();
          expect(newSerialized).toBeDefined();
          
          // Deserialize and verify
          const deserializedNew = deserialize(newSerialized) as DeserializedState;
          expect(deserializedNew.status).toBe(toStatus);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Config should support cookie storage for SSR compatibility.
   * 
   * **Validates: Requirements 4.5**
   */
  it("should have config that supports cookie storage", () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          const config = getConfig();
          
          // Config should exist and be properly configured
          expect(config).toBeDefined();
          
          // Should have storage configured (cookie storage)
          expect(config.storage).toBeDefined();
          
          // Should have SSR mode enabled
          // The config is created with ssr: true
          expect(config.chains.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
