"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type State, WagmiProvider } from "wagmi";
import { useState, type ReactNode } from "react";
import { config } from "@/lib/wagmi";
import { ThemeProvider } from "./ThemeProvider";

/**
 * Props for the Providers component.
 */
interface ProvidersProps {
  children: ReactNode;
  /** Initial state from cookies for SSR hydration */
  initialState?: State;
}

/**
 * Client-side providers wrapper component.
 * Wraps the application with WagmiProvider, QueryClientProvider,
 * and ThemeProvider for Web3, data fetching, and theming functionality.
 * 
 * Uses initialState from cookies to ensure SSR hydration consistency
 * and prevent hydration mismatches.
 */
export function Providers({ children, initialState }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Prevent refetching on window focus for better UX
            refetchOnWindowFocus: false,
            // Stale time of 60 seconds for blockchain data
            staleTime: 60 * 1000,
          },
        },
      })
  );

  return (
    <ThemeProvider defaultTheme="dark" storageKey="ancile-theme">
      <WagmiProvider config={config} initialState={initialState}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
