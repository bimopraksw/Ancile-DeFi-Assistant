"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

/**
 * ChatInterfaceLoading Component
 * 
 * Loading skeleton for the chat interface while it initializes.
 * Provides visual feedback during initial load.
 * 
 * Requirements: 9.5
 */
export function ChatInterfaceLoading() {
  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-4rem)]">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>

      {/* Messages area skeleton */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      {/* Input skeleton */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-10" />
        </div>
        <div className="flex gap-2 mt-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
    </div>
  );
}

/**
 * WalletConnectorLoading Component
 * 
 * Loading skeleton for the wallet connector.
 */
export function WalletConnectorLoading() {
  return (
    <Skeleton className="h-9 w-32" />
  );
}

/**
 * SwapCardLoading Component
 * 
 * Loading skeleton for the swap card component.
 */
export function SwapCardLoading() {
  return (
    <Card className="border-primary/20">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

/**
 * BalanceCardLoading Component
 * 
 * Loading skeleton for the balance card component.
 */
export function BalanceCardLoading() {
  return (
    <Card className="border-primary/20">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-28" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-4">
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

/**
 * PageLoading Component
 * 
 * Full page loading state with spinner.
 */
export function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Loading DeFi Interface...</p>
      </div>
    </div>
  );
}

/**
 * NetworkSwitcherLoading Component
 * 
 * Loading skeleton for the network switcher.
 */
export function NetworkSwitcherLoading() {
  return (
    <Skeleton className="h-6 w-20" />
  );
}
