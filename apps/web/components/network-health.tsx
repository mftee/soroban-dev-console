"use client";

import { useEffect } from "react";
import { useNetworkStore } from "@/store/useNetworkStore";
import { rpc as SorobanRpc } from "@stellar/stellar-sdk";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@devconsole/ui";
import { cn } from "@devconsole/ui";

export function NetworkHealth() {
  const { getActiveNetworkConfig, health, setHealth } = useNetworkStore();
  const config = getActiveNetworkConfig();

  useEffect(() => {
    async function checkHealth() {
      const server = new SorobanRpc.Server(config.rpcUrl);
      const start = Date.now();

      try {
        const latestLedger = await server.getLatestLedger();
        const latency = Date.now() - start;

        // In a real implementation, you might fetch protocol via server.getNetwork()
        // Here we simulate protocol 21 for demonstration
        setHealth({
          status: latency > 1000 ? "degraded" : "healthy",
          latestLedger: latestLedger.sequence,
          protocolVersion: 21,
          latencyMs: latency,
          lastCheck: Date.now(),
        });
      } catch {
        setHealth({
          status: "offline",
          latestLedger: 0,
          protocolVersion: 0,
          latencyMs: 0,
          lastCheck: Date.now(),
        });
      }
    }

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Poll every 30s

    return () => clearInterval(interval);
  }, [config.rpcUrl, setHealth]);

  if (!health) return null;

  const statusColors = {
    healthy: "bg-green-500",
    degraded: "bg-yellow-500",
    offline: "bg-red-500",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex cursor-help items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-muted">
            <div
              className={cn(
                "h-2 w-2 animate-pulse rounded-full",
                statusColors[health.status],
              )}
            />
            <span className="hidden font-mono text-xs text-muted-foreground lg:inline">
              {health.latencyMs}ms
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="space-y-1 text-xs">
          <p className="font-bold uppercase">{health.status}</p>
          <p>Ledger: {health.latestLedger}</p>
          <p>Protocol: {health.protocolVersion}</p>
          <p className="text-[10px] opacity-70">
            Last check: {new Date(health.lastCheck).toLocaleTimeString()}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
