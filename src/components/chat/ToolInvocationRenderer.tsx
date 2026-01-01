"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRightLeft, Wallet, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { UIMessagePart, UIDataTypes, UITools } from "ai";

type MessagePart = UIMessagePart<UIDataTypes, UITools>;

interface ToolPartExtended {
  type: string;
  toolName?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}

interface SwapToolArgs {
  tokenIn: string;
  tokenOut: string;
  amount: number;
  chain: string;
}

interface BalanceToolArgs {
  token: string;
  chain: string;
}

interface ToolInvocationRendererProps {
  toolPart: MessagePart;
}

export function isToolPart(part: MessagePart): boolean {
  return part.type.startsWith("tool-") || part.type === "dynamic-tool";
}

function getToolName(part: MessagePart): string {
  if (part.type === "dynamic-tool") {
    return (part as ToolPartExtended).toolName || "unknown";
  }
  if (part.type.startsWith("tool-")) {
    return part.type.replace("tool-", "");
  }
  return "unknown";
}

export function ToolInvocationRenderer({ toolPart }: ToolInvocationRendererProps) {
  const toolName = getToolName(toolPart);
  const extended = toolPart as ToolPartExtended;
  const state = extended.state || "";
  const input = extended.input;
  // const output = extended.output; // Reserved for future use
  const errorText = extended.errorText;

  if (state === "input-streaming") {
    return <ToolLoadingState toolName={toolName} />;
  }

  if (state === "input-available" || state === "approval-requested") {
    return (
      <ToolCallPreview
        toolName={toolName}
        args={input as Record<string, unknown>}
        isLoading={true}
      />
    );
  }

  if (state === "output-available") {
    return (
      <ToolResult
        toolName={toolName}
        args={input as Record<string, unknown>}
      />
    );
  }

  if (state === "output-error") {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{errorText || "Error"}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-muted">
      <CardContent className="p-3">
        <p className="text-sm text-muted-foreground">Processing: {toolName}</p>
      </CardContent>
    </Card>
  );
}

function ToolLoadingState({ toolName }: { toolName: string }) {
  const Icon = toolName === "swapTokens" ? ArrowRightLeft : Wallet;
  const title = toolName === "swapTokens" ? "Preparing Swap" : "Checking Balance";

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Loader2 className="h-4 w-4 animate-spin text-primary ml-auto" />
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardContent>
    </Card>
  );
}

function ToolCallPreview({
  toolName,
  args,
  isLoading,
}: {
  toolName: string;
  args: Record<string, unknown>;
  isLoading: boolean;
}) {
  if (toolName === "swapTokens") {
    const swapArgs = args as unknown as SwapToolArgs;
    return (
      <SwapCardPreview
        tokenIn={swapArgs?.tokenIn}
        tokenOut={swapArgs?.tokenOut}
        amount={swapArgs?.amount}
        chain={swapArgs?.chain}
        isLoading={isLoading}
      />
    );
  }

  if (toolName === "checkBalance") {
    const balanceArgs = args as unknown as BalanceToolArgs;
    return (
      <BalanceCardPreview
        token={balanceArgs?.token}
        chain={balanceArgs?.chain}
        isLoading={isLoading}
      />
    );
  }

  return (
    <Card className="border-muted">
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Unknown tool: {toolName}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ToolResult({
  toolName,
  args,
}: {
  toolName: string;
  args: Record<string, unknown>;
}) {
  if (toolName === "swapTokens") {
    const swapArgs = args as unknown as SwapToolArgs;
    return (
      <SwapCardPreview
        tokenIn={swapArgs?.tokenIn}
        tokenOut={swapArgs?.tokenOut}
        amount={swapArgs?.amount}
        chain={swapArgs?.chain}
        isLoading={false}
        isComplete={true}
      />
    );
  }

  if (toolName === "checkBalance") {
    const balanceArgs = args as unknown as BalanceToolArgs;
    return (
      <BalanceCardPreview
        token={balanceArgs?.token}
        chain={balanceArgs?.chain}
        isLoading={false}
        isComplete={true}
      />
    );
  }

  return (
    <Card className="border-muted">
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <p className="text-sm">Tool completed: {toolName}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SwapCardPreview({
  tokenIn,
  tokenOut,
  amount,
  chain,
  isLoading,
  isComplete = false,
}: {
  tokenIn?: string;
  tokenOut?: string;
  amount?: number;
  chain?: string;
  isLoading: boolean;
  isComplete?: boolean;
}) {
  return (
    <Card className={`border-primary/20 ${isComplete ? "bg-green-50 dark:bg-green-950/20" : "bg-primary/5"}`}>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium">Token Swap</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {chain && (
              <Badge variant="outline" className="text-xs capitalize">
                {chain}
              </Badge>
            )}
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            {isComplete && <CheckCircle2 className="h-4 w-4 text-green-500" />}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{amount ?? "..."}</span>
          <span className="text-muted-foreground">{tokenIn?.toUpperCase() ?? "..."}</span>
          <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">{tokenOut?.toUpperCase() ?? "..."}</span>
        </div>
        {isComplete && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">
            Swap prepared. Connect wallet to execute.
          </p>
        )}
        {isLoading && (
          <p className="text-xs text-muted-foreground mt-2">
            Preparing swap parameters...
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function BalanceCardPreview({
  token,
  chain,
  isLoading,
  isComplete = false,
}: {
  token?: string;
  chain?: string;
  isLoading: boolean;
  isComplete?: boolean;
}) {
  return (
    <Card className={`border-primary/20 ${isComplete ? "bg-green-50 dark:bg-green-950/20" : "bg-primary/5"}`}>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium">Balance Check</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {chain && (
              <Badge variant="outline" className="text-xs capitalize">
                {chain}
              </Badge>
            )}
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            {isComplete && <CheckCircle2 className="h-4 w-4 text-green-500" />}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Token:</span>
          <span className="font-medium">{token?.toUpperCase() ?? "..."}</span>
        </div>
        {isComplete && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">
            Connect wallet to view balance.
          </p>
        )}
        {isLoading && (
          <p className="text-xs text-muted-foreground mt-2">
            Preparing balance query...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
