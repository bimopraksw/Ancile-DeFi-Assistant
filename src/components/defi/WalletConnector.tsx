"use client";

import React, { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  Loader2,
  LogOut,
  ChevronDown,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAccount, useConnect, useDisconnect, useChainId } from "wagmi";
import { NetworkSwitcher } from "./NetworkSwitcher";
import { getChainById, getAddressExplorerUrl } from "@/lib/chains";

/**
 * WalletConnector Component
 * 
 * Provides wallet connection UI with:
 * - Connect/disconnect functionality
 * - Auto-discovery of all installed wallets (EIP-6963)
 * - Current wallet address display
 * - Network indicator and switcher
 * - Explorer link for connected address
 * 
 * Requirements: 4.1, 4.3, 4.5
 */
export function WalletConnector() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [connectingConnectorId, setConnectingConnectorId] = useState<string | null>(null);

  const currentChain = getChainById(chainId);

  // Handle wallet connection with a specific connector
  const handleConnect = useCallback((connector: typeof connectors[0]) => {
    setConnectingConnectorId(connector.uid);
    connect(
      { connector },
      {
        onSuccess: () => {
          setShowConnectDialog(false);
          setConnectingConnectorId(null);
        },
        onError: () => {
          setConnectingConnectorId(null);
        },
      }
    );
  }, [connect]);

  // Handle wallet disconnection
  const handleDisconnect = useCallback(() => {
    disconnect();
  }, [disconnect]);

  // Format address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Check if any wallet is available
  const hasWallets = connectors.length > 0;

  // Not connected state
  if (!isConnected) {
    return (
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isConnecting}
            className="glass-button border-white/20 hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/10 transition-all duration-300"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin text-violet-400" />
                <span className="gradient-text">Connecting...</span>
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4 mr-2 text-violet-400" />
                <span>Connect Wallet</span>
              </>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md glass border-white/10">
          <DialogHeader>
            <DialogTitle className="gradient-text">Connect Wallet</DialogTitle>
            <DialogDescription>
              Choose a wallet to connect to Ancile
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {/* Show available connectors */}
            {connectors.map((connector) => {
              const isConnectorLoading = connectingConnectorId === connector.uid;
              return (
                <Button
                  key={connector.uid}
                  variant="outline"
                  className="w-full justify-start gap-3 h-14 glass-button border-white/10 hover:border-violet-500/30 hover:bg-violet-500/10 transition-all duration-300"
                  onClick={() => handleConnect(connector)}
                  disabled={isConnecting}
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center overflow-hidden">
                    {connector.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={connector.icon} 
                        alt={connector.name} 
                        className="w-6 h-6"
                      />
                    ) : (
                      <Wallet className="h-4 w-4 text-violet-400" />
                    )}
                  </div>
                  <div className="flex flex-col items-start flex-1">
                    <span className="font-medium">{connector.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {connector.type === "injected" ? "Browser Extension" : "Connect"}
                    </span>
                  </div>
                  {isConnectorLoading && (
                    <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                  )}
                </Button>
              );
            })}

            {/* Show warning if no wallet detected */}
            {!hasWallets && (
              <div className="p-3 glass border border-yellow-500/20 rounded-lg">
                <div className="flex items-start gap-2 text-yellow-500">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">No wallet detected</p>
                    <p className="text-xs mt-1 text-muted-foreground">
                      Install a Web3 wallet extension like MetaMask, Rabby, or Phantom to connect.
                    </p>
                    <a
                      href="https://metamask.io/download/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-violet-400 hover:text-violet-300 underline mt-1 inline-block"
                    >
                      Get MetaMask →
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Show connection error */}
            {connectError && (
              <div className="p-3 glass border border-red-500/20 rounded-lg">
                <div className="flex items-start gap-2 text-red-400">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">Connection failed</p>
                    <p className="text-xs mt-1 text-muted-foreground break-words">
                      {connectError.message.includes("rejected") 
                        ? "Connection was rejected. Please try again."
                        : connectError.message.includes("already pending")
                        ? "A connection request is already pending. Check your wallet."
                        : connectError.message || "Please try again or use a different wallet."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Connected state
  return (
    <div className="flex items-center gap-2">
      {/* Network Switcher */}
      <NetworkSwitcher variant="badge" />

      {/* Wallet Info Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 glass-button border-white/20 hover:border-green-500/30 transition-all duration-300">
            <span
              className="w-2 h-2 rounded-full bg-green-500 animate-pulse"
              aria-label="Connected"
            />
            <span className="font-mono text-sm">{formatAddress(address!)}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md glass border-white/10">
          <DialogHeader>
            <DialogTitle className="gradient-text">Wallet Connected</DialogTitle>
            <DialogDescription>
              Manage your wallet connection and view details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Address */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Address</p>
              <div className="flex items-center justify-between p-3 glass rounded-lg border border-white/10">
                <code className="text-sm font-mono">{formatAddress(address!)}</code>
                <a
                  href={getAddressExplorerUrl(
                    currentChain?.name.toLowerCase() || "ethereum",
                    address!
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-400 hover:text-violet-300 flex items-center gap-1 text-sm transition-colors"
                >
                  View
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* Network */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Network</p>
              <div className="flex items-center justify-between p-3 glass rounded-lg border border-white/10">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: currentChain?.color || "#888" }}
                  />
                  <span className="text-sm font-medium">
                    {currentChain?.name || "Unknown Network"}
                  </span>
                </div>
                <Badge variant="outline" className="text-xs border-white/20">
                  Chain ID: {chainId}
                </Badge>
              </div>
            </div>

            {/* Network Switcher */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Switch Network</p>
              <NetworkSwitcher variant="button" className="w-full" />
            </div>

            {/* Disconnect Button */}
            <Button
              onClick={handleDisconnect}
              variant="destructive"
              className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 border-0"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Disconnect Wallet
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
