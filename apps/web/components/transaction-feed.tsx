"use client";

import { useEffect, useState, useRef } from "react";
import { Horizon } from "@stellar/stellar-sdk";
import { useWallet } from "@/store/useWallet";
import { useNetworkStore } from "@/store/useNetworkStore";
import {
  Activity,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Clock,
  Box,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@devconsole/ui";
import { Button } from "@devconsole/ui";
import { ScrollArea } from "@devconsole/ui";
import { Badge } from "@devconsole/ui";
import { Alert, AlertDescription, AlertTitle } from "@devconsole/ui";

const getHorizonUrl = (networkId: string) => {
  switch (networkId) {
    case "mainnet":
      return "https://horizon.stellar.org";
    case "testnet":
      return "https://horizon-testnet.stellar.org";
    case "futurenet":
      return "https://horizon-futurenet.stellar.org";
    case "local":
      return "http://localhost:8000";
    default:
      return "https://horizon-testnet.stellar.org";
  }
};

interface TxRecord {
  id: string;
  hash: string;
  successful: boolean;
  created_at: string;
  operation_count: number;
  memo?: string;
  source_account?: string;
}

export function TransactionFeed() {
  const { address, isConnected } = useWallet();
  const { currentNetwork } = useNetworkStore();

  const [transactions, setTransactions] = useState<TxRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAccountMissing, setIsAccountMissing] = useState(false);
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const horizonUrl = getHorizonUrl(currentNetwork);

  // Cleanup on unmount or account/network change
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Reset state when account or network changes
  useEffect(() => {
    setTransactions([]);
    setError(null);
    setIsAccountMissing(false);
    setLastEventTime(null);
  }, [address, currentNetwork]);

  useEffect(() => {
    if (!address || !isConnected) return;

    let es: EventSource | null = null;

    const connectSSE = () => {
      if (!mountedRef.current) return;

      setLoading(true);
      setError(null);

      const url = `${horizonUrl}/accounts/${address}/payments?cursor=now&order=desc`;
      es = new EventSource(url);

      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "payment" || data.type === "create_account") {
            const tx: TxRecord = {
              id: data.transaction_hash || data.id,
              hash: data.transaction_hash || data.id,
              successful: true, // payments are successful by definition
              created_at: data.created_at,
              operation_count: 1,
              memo: data.memo,
              source_account: data.source_account,
            };

            setTransactions((prev) => {
              // Deduplicate by id
              if (prev.some((t) => t.id === tx.id)) return prev;
              // Keep latest 15
              const updated = [tx, ...prev].slice(0, 15);
              return updated;
            });

            setLastEventTime(new Date());
            setIsAccountMissing(false);
          }
        } catch (err) {
          console.error("SSE parse error:", err);
        }
      };

      es.onerror = (err) => {
        console.error("SSE error:", err);
        if (es) es.close();
        setError("Lost connection to Horizon. Reconnecting...");

        // Reconnect after delay
        if (mountedRef.current) {
          reconnectTimeoutRef.current = setTimeout(connectSSE, 5000);
        }
      };

      // Initial load of recent transactions (fallback for first render)
      const server = new Horizon.Server(horizonUrl);
      server
        .payments()
        .forAccount(address)
        .limit(15)
        .order("desc")
        .call()
        .then((response) => {
          if (!mountedRef.current) return;
          const recentTxs = response.records.map((rec: any) => ({
            id: rec.transaction_hash || rec.id,
            hash: rec.transaction_hash || rec.id,
            successful: true,
            created_at: rec.created_at,
            operation_count: 1,
            memo: rec.memo,
            source_account: rec.source_account,
          }));
          setTransactions(recentTxs);
          setLoading(false);
        })
        .catch((err) => {
          if (err.response?.status === 404) {
            setIsAccountMissing(true);
          } else {
            setError("Failed to load initial transactions");
          }
          setLoading(false);
        });
    };

    connectSSE();

    return () => {
      if (es) es.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [address, isConnected, currentNetwork, horizonUrl]);

  const formatTime = (dateStr: string) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(dateStr));
  };

  const handleManualRefresh = () => {
    // Force reconnect
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    // The effect will re-trigger on dependency change, but we can force it here
    setTransactions([]);
    setLastEventTime(null);
  };

  if (!isConnected) {
    return (
      <Card className="h-full border-dashed">
        <CardContent className="flex h-[300px] flex-col items-center justify-center gap-2 text-muted-foreground">
          <Activity className="h-8 w-8 opacity-50" />
          <p>Connect wallet to view transactions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex h-full w-full flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-4 w-4 text-blue-500" />
              Live Transaction Feed
            </CardTitle>
            <CardDescription className="text-xs">
              Real-time via Horizon SSE • {currentNetwork}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {lastEventTime && (
              <Badge
                variant="outline"
                className="font-mono text-[10px] opacity-70"
              >
                Last event {lastEventTime.toLocaleTimeString()}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleManualRefresh}
              title="Refresh stream"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-[400px]">
          <div className="flex flex-col divide-y">
            {isAccountMissing ? (
              <div className="flex flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted-foreground">
                <AlertCircle className="h-8 w-8 text-orange-400 opacity-50" />
                <div>
                  <p className="font-semibold text-foreground">
                    Account Not Found
                  </p>
                  <p className="mt-1">
                    This account has not been funded on {currentNetwork} yet.
                    Fund it via Friendbot or another account.
                  </p>
                </div>
              </div>
            ) : error ? (
              <Alert variant="destructive" className="m-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : transactions.length === 0 && !loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No transactions yet on this account.
              </div>
            ) : (
              transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="shrink-0">
                    {tx.successful ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/15">
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/15">
                        <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        Transaction
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {tx.hash.slice(0, 6)}...{tx.hash.slice(-6)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(tx.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Box className="h-3 w-3" />
                        {tx.operation_count} Op{tx.operation_count !== 1 ? "s" : ""}
                      </span>
                      {tx.source_account && (
                        <span className="font-mono text-xs truncate max-w-[120px]">
                          From {tx.source_account.slice(0, 6)}...
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    className="h-8 w-8 text-muted-foreground"
                  >
                    <a
                      href={`https://stellar.expert/explorer/${currentNetwork}/tx/${tx.hash}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}