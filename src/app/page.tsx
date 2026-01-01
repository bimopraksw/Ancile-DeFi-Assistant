import { ChatInterface } from "@/components/chat";
import { WalletConnector } from "@/components/defi/WalletConnector";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Suspense } from "react";
import { ChatInterfaceLoading, WalletConnectorLoading } from "@/components/LoadingStates";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  return (
    <div className="flex flex-col h-screen relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-violet-500/30 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/3 -right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-20 left-1/3 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <header className="glass border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          {/* Logo - Shield Icon representing Ancile */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg glow-sm">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold gradient-text">Ancile</h1>
            <p className="text-xs text-muted-foreground">
              Sacred shield for your crypto
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <ErrorBoundary
            fallback={<WalletConnectorLoading />}
            showDetails={process.env.NODE_ENV === "development"}
          >
            <Suspense fallback={<WalletConnectorLoading />}>
              <WalletConnector />
            </Suspense>
          </ErrorBoundary>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="h-full max-w-4xl mx-auto">
          <ErrorBoundary
            showDetails={process.env.NODE_ENV === "development"}
          >
            <Suspense fallback={<ChatInterfaceLoading />}>
              <ChatInterface />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
