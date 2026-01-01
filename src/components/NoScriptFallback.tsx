/**
 * NoScriptFallback Component
 * 
 * Provides a functional fallback interface when JavaScript is disabled.
 * This component renders inside a <noscript> tag and provides basic
 * information and guidance for users without JavaScript.
 * 
 * Requirements: 9.5
 */
export function NoScriptFallback() {
  return (
    <noscript>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border rounded-lg shadow-lg p-6 space-y-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              DeFi Intent Interface
            </h1>
            <p className="text-muted-foreground">
              Natural language interface for DeFi transactions
            </p>
          </div>
          
          <div className="border-t pt-4">
            <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <svg
                className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <h2 className="font-semibold text-yellow-700 dark:text-yellow-400">
                  JavaScript Required
                </h2>
                <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-1">
                  This application requires JavaScript to function properly.
                  Please enable JavaScript in your browser settings to use the
                  DeFi Intent Interface.
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">
              Why JavaScript is needed:
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Real-time AI-powered natural language processing</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Secure wallet connection and transaction signing</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Interactive DeFi components and live updates</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Multi-chain blockchain interactions</span>
              </li>
            </ul>
          </div>
          
          <div className="border-t pt-4">
            <h3 className="font-semibold text-foreground mb-2">
              How to enable JavaScript:
            </h3>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Chrome:</strong> Settings → Privacy and security → 
                Site settings → JavaScript → Allow
              </p>
              <p>
                <strong>Firefox:</strong> Type about:config in address bar → 
                Search javascript.enabled → Set to true
              </p>
              <p>
                <strong>Safari:</strong> Preferences → Security → 
                Enable JavaScript
              </p>
            </div>
          </div>
          
          <div className="text-center text-xs text-muted-foreground pt-2">
            <p>
              For security reasons, all transactions require explicit approval
              through your connected wallet.
            </p>
          </div>
        </div>
      </div>
    </noscript>
  );
}
