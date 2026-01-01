"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRef, useEffect, useState, useCallback, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, AlertCircle, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { ToolInvocationRenderer, isToolPart } from "./ToolInvocationRenderer";
import {
  classifyError,
  formatErrorForDisplay,
  clearRecoveredState,
  type AppError,
} from "@/lib/error-handling";
import type { UIMessagePart, TextUIPart, UIDataTypes, UITools } from "ai";

type MessagePart = UIMessagePart<UIDataTypes, UITools>;

/**
 * Helper to extract text content from message parts.
 */
function getTextContent(parts: MessagePart[]): string {
  return parts
    .filter((part): part is TextUIPart => part.type === "text")
    .map((part) => part.text)
    .join("");
}

/**
 * Helper to extract tool invocations from message parts.
 */
function getToolParts(parts: MessagePart[]): MessagePart[] {
  return parts.filter((part) => isToolPart(part));
}

/**
 * Count the number of completed tool steps in a conversation.
 * Used to track multi-step agentic reasoning progress.
 */
function countCompletedToolSteps(parts: MessagePart[]): number {
  return parts.filter((part) => {
    const extended = part as { state?: string };
    return isToolPart(part) && extended.state === "output-available";
  }).length;
}

/**
 * Maximum number of steps allowed in a single agentic loop.
 * This matches the server-side configuration.
 * 
 * Requirements: 3.4
 */
const MAX_AGENTIC_STEPS = 5;

/**
 * ChatInterface component for natural language DeFi interactions.
 * Uses the Vercel AI SDK useChat hook with maxSteps: 5 for agentic loops.
 * Supports multi-step reasoning where the AI can chain operations based on previous results.
 * Includes comprehensive error handling and state recovery.
 * 
 * Requirements: 3.1, 3.2, 3.4, 6.3, 6.4, 7.4
 */
export function ChatInterface() {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [classifiedError, setClassifiedError] = useState<AppError | null>(null);
  const [recoveryId, setRecoveryId] = useState<string | null>(null);
  
  const {
    messages,
    sendMessage,
    status,
    error,
    clearError,
    regenerate,
  } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    /**
     * Callback when tool results are received.
     * Used to track multi-step progress and enable chaining operations.
     * 
     * Requirements: 3.1, 3.2
     */
    onToolCall: useCallback((options: { toolCall: { toolName: string } }) => {
      // Track tool calls for multi-step operations
      console.log(`[Agentic Loop] Tool called: ${options.toolCall.toolName}`);
      return undefined; // Let the server handle tool execution
    }, []),
    /**
     * Error handler with classification and recovery
     * 
     * Requirements: 6.4, 7.4
     */
    onError: useCallback((err: Error) => {
      const classified = classifyError(err);
      setClassifiedError(classified);
    }, []),
  });

  // Track the current step count based on completed tool invocations
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant") {
        const completedSteps = countCompletedToolSteps(lastMessage.parts);
        setCurrentStep(completedSteps);
      }
    }
  }, [messages]);

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    
    const message = inputValue;
    setInputValue("");
    // Reset step counter for new conversation turn
    setCurrentStep(0);
    await sendMessage({ text: message });
  };

  return (
    <div 
      className="flex flex-col h-full max-h-[calc(100vh-4rem)] glass-card rounded-2xl overflow-hidden"
      role="region"
      aria-label="DeFi Chat Interface"
    >
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-pink-500/10">
        <Avatar className="h-10 w-10 ring-2 ring-violet-500/30">
          <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="font-semibold text-sm gradient-text" id="chat-title">Ancile Guardian</h2>
          <p className="text-xs text-muted-foreground">
            Your divine protector for DeFi transactions
          </p>
        </div>
        {/* Multi-step progress indicator */}
        {isLoading && currentStep > 0 && (
          <div className="flex items-center gap-2" role="status" aria-live="polite">
            <Badge className="text-xs bg-violet-500/20 text-violet-300 border-violet-500/30">
              Step {currentStep}/{MAX_AGENTIC_STEPS}
            </Badge>
            <Loader2 className="h-4 w-4 animate-spin text-violet-400" aria-hidden="true" />
            <span className="sr-only">Processing step {currentStep} of {MAX_AGENTIC_STEPS}</span>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div
        ref={scrollAreaRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 via-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4 animate-float">
              <Sparkles className="h-10 w-10 text-violet-400" aria-hidden="true" />
            </div>
            <p className="text-lg font-medium gradient-text">Welcome to Ancile</p>
            <p className="text-sm max-w-md mt-2 text-muted-foreground">
              Your sacred shield for crypto assets. Try commands like &quot;Swap 100 USDC for ETH on Base&quot; or &quot;Check my ETH balance&quot;
            </p>
            <p className="text-xs max-w-md mt-3 text-muted-foreground/70">
              I can also handle complex multi-step requests like &quot;Check my ETH balance and swap half of it for USDC&quot;
            </p>
            <div className="flex gap-2 mt-6 flex-wrap justify-center">
              <Badge className="bg-violet-500/10 text-violet-300 border-violet-500/20 hover:bg-violet-500/20 cursor-pointer transition-colors">
                💱 Swap tokens
              </Badge>
              <Badge className="bg-blue-500/10 text-blue-300 border-blue-500/20 hover:bg-blue-500/20 cursor-pointer transition-colors">
                💰 Check balance
              </Badge>
              <Badge className="bg-pink-500/10 text-pink-300 border-pink-500/20 hover:bg-pink-500/20 cursor-pointer transition-colors">
                🌐 Multi-chain
              </Badge>
            </div>
          </div>
        )}

        {messages.map((message) => {
          const textContent = getTextContent(message.parts);
          const toolParts = getToolParts(message.parts);
          
          return (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
              role="article"
              aria-label={`${message.role === "user" ? "Your message" : "Assistant response"}`}
            >
              {message.role === "assistant" && (
                <Avatar className="h-8 w-8 shrink-0 ring-2 ring-violet-500/20">
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                    <Bot className="h-4 w-4" aria-hidden="true" />
                  </AvatarFallback>
                </Avatar>
              )}

              <div
                className={`flex flex-col gap-2 max-w-[80%] ${
                  message.role === "user" ? "items-end" : "items-start"
                }`}
              >
                {/* Message Content */}
                {textContent && (
                  <div
                    className={`rounded-2xl p-3 ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/20"
                        : "glass border border-white/10"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{textContent}</p>
                  </div>
                )}

                {/* Tool Invocations */}
                {toolParts.length > 0 && (
                  <div className="w-full space-y-2" role="group" aria-label="Tool actions">
                    {toolParts.map((toolPart, index) => (
                      <ToolInvocationRenderer
                        key={`tool-${index}`}
                        toolPart={toolPart}
                      />
                    ))}
                  </div>
                )}
              </div>

              {message.role === "user" && (
                <Avatar className="h-8 w-8 shrink-0 ring-2 ring-pink-500/20">
                  <AvatarFallback className="bg-gradient-to-br from-pink-500 to-rose-600 text-white">
                    <User className="h-4 w-4" aria-hidden="true" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          );
        })}

        {/* Loading State */}
        {isLoading && (
          <div className="flex gap-3 justify-start" role="status" aria-live="polite">
            <Avatar className="h-8 w-8 shrink-0 ring-2 ring-violet-500/20">
              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                <Bot className="h-4 w-4" aria-hidden="true" />
              </AvatarFallback>
            </Avatar>
            <div className="glass border border-white/10 rounded-2xl p-3">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
              <span className="sr-only">Assistant is thinking...</span>
            </div>
          </div>
        )}

        {/* Error State with Enhanced Error Handling */}
        {(error || classifiedError) && (
          <div className="flex gap-3 justify-start" role="alert" aria-live="assertive">
            <Avatar className="h-8 w-8 shrink-0 ring-2 ring-red-500/20">
              <AvatarFallback className="bg-gradient-to-br from-red-500 to-rose-600 text-white">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
              </AvatarFallback>
            </Avatar>
            <div className="glass border border-red-500/20 rounded-2xl p-3 bg-red-500/5">
              <div className="flex flex-col gap-2">
                {classifiedError ? (
                  <>
                    <p className="text-sm font-medium text-red-400">
                      {formatErrorForDisplay(classifiedError).title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatErrorForDisplay(classifiedError).description}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-red-400">{error?.message}</p>
                )}
                <div className="flex gap-2 mt-1">
                  {(classifiedError?.retryable ?? true) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        clearError();
                        setClassifiedError(null);
                        if (recoveryId) {
                          clearRecoveredState(recoveryId);
                          setRecoveryId(null);
                        }
                        regenerate();
                      }}
                      className="w-fit glass-button border-white/10"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" aria-hidden="true" />
                      Try again
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      clearError();
                      setClassifiedError(null);
                      if (recoveryId) {
                        clearRecoveredState(recoveryId);
                        setRecoveryId(null);
                      }
                    }}
                    className="w-fit hover:bg-white/5"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-white/10 bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-pink-500/5">
        <form onSubmit={handleSubmit} className="flex gap-2" role="form" aria-label="Send a message">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your DeFi request..."
            disabled={isLoading}
            className="flex-1 glass border-white/10 focus:border-violet-500/50 focus:ring-violet-500/20 placeholder:text-muted-foreground/50"
            aria-label="Message input"
            aria-describedby="input-hints"
          />
          <Button 
            type="submit" 
            disabled={isLoading || !inputValue.trim()}
            aria-label="Send message"
            className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg shadow-violet-500/25 border-0"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Send message</span>
          </Button>
        </form>
        <div className="flex gap-2 mt-3 flex-wrap" id="input-hints" aria-label="Available commands">
          <Badge className="text-xs bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10 cursor-pointer transition-colors">
            💱 Swap tokens
          </Badge>
          <Badge className="text-xs bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10 cursor-pointer transition-colors">
            💰 Check balance
          </Badge>
          <Badge className="text-xs bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10 cursor-pointer transition-colors">
            🌐 Multi-chain
          </Badge>
          <Badge className="text-xs bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10 cursor-pointer transition-colors">
            🔄 Multi-step
          </Badge>
        </div>
      </div>
    </div>
  );
}
