/**
 * Unit Tests for Interactive Components (SwapCard and BalanceCard)
 * 
 * Feature: defi-intent-interface
 * Validates: Requirements 5.1, 5.2, 5.3
 * 
 * Tests SwapCard rendering and user interactions, BalanceCard display and data fetching,
 * and error states and edge cases.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http, mock } from "wagmi";
import { mainnet, base } from "wagmi/chains";
import { SwapCard, type SwapCardProps } from "@/components/defi/SwapCard";
import { BalanceCard, type BalanceCardProps } from "@/components/defi/BalanceCard";

// Create a mock wagmi config for testing
const mockConfig = createConfig({
  chains: [mainnet, base],
  connectors: [
    mock({
      accounts: ["0x1234567890123456789012345678901234567890"],
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
  },
});

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <WagmiProvider config={mockConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

describe("SwapCard Component", () => {
  const defaultProps: SwapCardProps = {
    tokenIn: "ETH",
    tokenOut: "USDC",
    amount: 1.5,
    chain: "ethereum",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render with correct token symbols", () => {
      render(
        <TestWrapper>
          <SwapCard {...defaultProps} />
        </TestWrapper>
      );

      // ETH appears multiple times (in token display and amount label)
      expect(screen.getAllByText("ETH").length).toBeGreaterThan(0);
      expect(screen.getByText("USDC")).toBeInTheDocument();
    });

    it("should render with correct chain badge", () => {
      render(
        <TestWrapper>
          <SwapCard {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText("Ethereum")).toBeInTheDocument();
    });

    it("should render Token Swap title", () => {
      render(
        <TestWrapper>
          <SwapCard {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText("Token Swap")).toBeInTheDocument();
    });

    it("should render with initial amount in input", () => {
      render(
        <TestWrapper>
          <SwapCard {...defaultProps} />
        </TestWrapper>
      );

      const input = screen.getByRole("spinbutton");
      expect(input).toHaveValue(1.5);
    });

    it("should render connect wallet button when not connected", () => {
      render(
        <TestWrapper>
          <SwapCard {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText("Connect Wallet")).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("should allow editing the amount input", () => {
      render(
        <TestWrapper>
          <SwapCard {...defaultProps} />
        </TestWrapper>
      );

      const input = screen.getByRole("spinbutton");
      fireEvent.change(input, { target: { value: "2.5" } });
      expect(input).toHaveValue(2.5);
    });

    it("should show error for invalid amount", () => {
      render(
        <TestWrapper>
          <SwapCard {...defaultProps} />
        </TestWrapper>
      );

      const input = screen.getByRole("spinbutton");
      fireEvent.change(input, { target: { value: "-1" } });
      
      // Invalid amount should show error message
      expect(screen.getByText("Please enter a valid amount")).toBeInTheDocument();
    });

    it("should show error for zero amount", () => {
      render(
        <TestWrapper>
          <SwapCard {...defaultProps} />
        </TestWrapper>
      );

      const input = screen.getByRole("spinbutton");
      fireEvent.change(input, { target: { value: "0" } });
      
      expect(screen.getByText("Please enter a valid amount")).toBeInTheDocument();
    });
  });

  describe("Token Validation", () => {
    it("should show error for unsupported token on chain", () => {
      render(
        <TestWrapper>
          <SwapCard
            {...defaultProps}
            tokenIn="FAKE"
            tokenOut="USDC"
          />
        </TestWrapper>
      );

      expect(screen.getByText(/FAKE is not supported on ethereum/i)).toBeInTheDocument();
    });

    it("should show error when both tokens are unsupported", () => {
      render(
        <TestWrapper>
          <SwapCard
            {...defaultProps}
            tokenIn="FAKE1"
            tokenOut="FAKE2"
          />
        </TestWrapper>
      );

      expect(screen.getByText(/FAKE1 and FAKE2 are not supported on ethereum/i)).toBeInTheDocument();
    });
  });

  describe("Different Chains", () => {
    it("should render correctly for Base chain", () => {
      render(
        <TestWrapper>
          <SwapCard
            {...defaultProps}
            chain="base"
          />
        </TestWrapper>
      );

      expect(screen.getByText("Base")).toBeInTheDocument();
    });

    it("should render correctly for Polygon chain", () => {
      render(
        <TestWrapper>
          <SwapCard
            {...defaultProps}
            tokenIn="MATIC"
            tokenOut="USDC"
            chain="polygon"
          />
        </TestWrapper>
      );

      expect(screen.getByText("Polygon")).toBeInTheDocument();
      // MATIC appears multiple times (in token display and amount label)
      expect(screen.getAllByText("MATIC").length).toBeGreaterThan(0);
    });
  });
});

describe("BalanceCard Component", () => {
  const defaultProps: BalanceCardProps = {
    token: "ETH",
    chain: "ethereum",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render with correct token symbol", () => {
      render(
        <TestWrapper>
          <BalanceCard {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText("ETH")).toBeInTheDocument();
    });

    it("should render Balance Check title", () => {
      render(
        <TestWrapper>
          <BalanceCard {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText("Balance Check")).toBeInTheDocument();
    });

    it("should render chain badge", () => {
      render(
        <TestWrapper>
          <BalanceCard {...defaultProps} />
        </TestWrapper>
      );

      // "Ethereum" appears multiple times (chain badge and token name)
      expect(screen.getAllByText("Ethereum").length).toBeGreaterThan(0);
    });

    it("should render connect wallet button when not connected", () => {
      render(
        <TestWrapper>
          <BalanceCard {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText("Connect Wallet to View Balance")).toBeInTheDocument();
    });

    it("should render token name", () => {
      render(
        <TestWrapper>
          <BalanceCard {...defaultProps} />
        </TestWrapper>
      );

      // "Ethereum" appears as both chain name and token name for ETH
      expect(screen.getAllByText("Ethereum").length).toBeGreaterThan(0);
    });
  });

  describe("Token Validation", () => {
    it("should show error for unsupported token", () => {
      render(
        <TestWrapper>
          <BalanceCard
            {...defaultProps}
            token="FAKE"
          />
        </TestWrapper>
      );

      expect(screen.getByText(/FAKE is not supported on Ethereum/i)).toBeInTheDocument();
    });

    it("should show not supported badge for invalid token", () => {
      render(
        <TestWrapper>
          <BalanceCard
            {...defaultProps}
            token="INVALID"
          />
        </TestWrapper>
      );

      expect(screen.getByText("Not supported")).toBeInTheDocument();
    });
  });

  describe("Different Chains", () => {
    it("should render correctly for Base chain", () => {
      render(
        <TestWrapper>
          <BalanceCard
            {...defaultProps}
            chain="base"
          />
        </TestWrapper>
      );

      expect(screen.getByText("Base")).toBeInTheDocument();
    });

    it("should render correctly for Polygon with MATIC", () => {
      render(
        <TestWrapper>
          <BalanceCard
            token="MATIC"
            chain="polygon"
          />
        </TestWrapper>
      );

      // "Polygon" appears multiple times (chain badge and token name)
      expect(screen.getAllByText("Polygon").length).toBeGreaterThan(0);
      expect(screen.getByText("MATIC")).toBeInTheDocument();
    });

    it("should render correctly for BSC with BNB", () => {
      render(
        <TestWrapper>
          <BalanceCard
            token="BNB"
            chain="bsc"
          />
        </TestWrapper>
      );

      expect(screen.getByText("BNB Smart Chain")).toBeInTheDocument();
      // "BNB" appears multiple times (symbol and name)
      expect(screen.getAllByText("BNB").length).toBeGreaterThan(0);
    });
  });

  describe("Token Metadata", () => {
    it("should display USDC with correct name", () => {
      render(
        <TestWrapper>
          <BalanceCard
            token="USDC"
            chain="ethereum"
          />
        </TestWrapper>
      );

      expect(screen.getByText("USDC")).toBeInTheDocument();
      expect(screen.getByText("USD Coin")).toBeInTheDocument();
    });

    it("should display DAI with correct name", () => {
      render(
        <TestWrapper>
          <BalanceCard
            token="DAI"
            chain="ethereum"
          />
        </TestWrapper>
      );

      expect(screen.getByText("DAI")).toBeInTheDocument();
      expect(screen.getByText("Dai Stablecoin")).toBeInTheDocument();
    });
  });
});

describe("Error States and Edge Cases", () => {
  describe("SwapCard Edge Cases", () => {
    it("should handle very large amounts", () => {
      render(
        <TestWrapper>
          <SwapCard
            tokenIn="ETH"
            tokenOut="USDC"
            amount={999999999}
            chain="ethereum"
          />
        </TestWrapper>
      );

      const input = screen.getByRole("spinbutton");
      expect(input).toHaveValue(999999999);
    });

    it("should handle decimal amounts", () => {
      render(
        <TestWrapper>
          <SwapCard
            tokenIn="ETH"
            tokenOut="USDC"
            amount={0.000001}
            chain="ethereum"
          />
        </TestWrapper>
      );

      const input = screen.getByRole("spinbutton");
      expect(input).toHaveValue(0.000001);
    });

    it("should handle empty string in amount input", () => {
      render(
        <TestWrapper>
          <SwapCard
            tokenIn="ETH"
            tokenOut="USDC"
            amount={1}
            chain="ethereum"
          />
        </TestWrapper>
      );

      const input = screen.getByRole("spinbutton");
      fireEvent.change(input, { target: { value: "" } });
      
      // Empty input should not show error (user is still typing)
      expect(screen.queryByText("Please enter a valid amount")).not.toBeInTheDocument();
    });
  });

  describe("BalanceCard Edge Cases", () => {
    it("should handle unknown token gracefully", () => {
      render(
        <TestWrapper>
          <BalanceCard
            token="UNKNOWN"
            chain="ethereum"
          />
        </TestWrapper>
      );

      // Should still render the token symbol (appears multiple times)
      expect(screen.getAllByText("UNKNOWN").length).toBeGreaterThan(0);
    });

    it("should handle case-insensitive token symbols", () => {
      render(
        <TestWrapper>
          <BalanceCard
            token="eth"
            chain="ethereum"
          />
        </TestWrapper>
      );

      // Should display uppercase
      expect(screen.getByText("ETH")).toBeInTheDocument();
    });
  });
});
