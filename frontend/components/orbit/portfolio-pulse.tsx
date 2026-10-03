"use client";

import { AlertTriangle, TrendingUp, Clock, ArrowRight } from "lucide-react";
import { SentinelMetrics } from "./sentinel-metrics";
import { ChurnRadarChart } from "./churn-radar-chart";
import { useOrbit } from "./orbit-provider";
import { formatRelativeTime } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function PortfolioPulse() {
  const { accounts, selectAccount, setActiveView, getPortfolioMetrics, getActivitiesForAccount } = useOrbit();
  
  const metrics = getPortfolioMetrics();
  const activeAccounts = accounts.filter((acc) => acc.status !== 'archived');
  const atRiskAccounts = activeAccounts.filter((acc) => acc.healthScore < 50);
  const recentActivity = activeAccounts
    .slice()
    .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
    .slice(0, 5);

  const handleAccountClick = (accountId: string) => {
    selectAccount(accountId);
    setActiveView("accounts");
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* Header - minimal */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Portfolio Pulse
          </h1>
          <p className="text-[13px] text-muted-foreground/70 mt-0.5">
            Executive overview of your customer portfolio
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
          <Clock className="w-3 h-3" />
          Updated just now
        </div>
      </div>

      {/* Sentinel Metrics */}
      <SentinelMetrics
        totalArr={metrics.totalArr}
        averageNrr={metrics.averageNrr}
        averageHealthScore={metrics.averageHealthScore}
        accountCount={metrics.accountCount}
      />

      {/* Main content grid - 70/30 split */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        {/* Churn Chart */}
        <div className="bg-card rounded-md p-5">
          <ChurnRadarChart />
        </div>

        {/* At-risk accounts */}
        <div className="bg-card rounded-md p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-md bg-critical/8 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 text-critical" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-[13px] font-medium text-foreground">
                Accounts at Risk
              </h3>
              <p className="text-[11px] text-muted-foreground/60">
                {atRiskAccounts.length} accounts need attention
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {atRiskAccounts.slice(0, 5).map((account) => (
              <button
                key={account.id}
                onClick={() => handleAccountClick(account.id)}
                className="w-full p-3 bg-secondary/30 rounded-md hover:bg-secondary/50 transition-colors cursor-pointer text-left group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors">
                    {account.name}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-mono px-1.5 py-0.5 rounded",
                      account.healthScore < 30
                        ? "badge-critical"
                        : "badge-warning"
                    )}
                  >
                    {account.healthScore}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground/60">
                  Last activity: {formatRelativeTime(account.lastActivity)}
                </p>
              </button>
            ))}

            {atRiskAccounts.length === 0 && (
              <div className="text-center py-8">
                <div className="w-10 h-10 rounded-md bg-success/8 flex items-center justify-center mx-auto mb-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                </div>
                <p className="text-[13px] font-medium text-foreground">All accounts healthy</p>
                <p className="text-[11px] text-muted-foreground/60">No accounts at risk</p>
              </div>
            )}

            {atRiskAccounts.length > 5 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-[11px] text-muted-foreground/60 hover:text-foreground h-8"
                onClick={() => setActiveView("accounts")}
              >
                View all {atRiskAccounts.length} at-risk accounts
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Recent activity - minimal */}
      <div className="bg-card rounded-md p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-primary/8 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-[13px] font-medium text-foreground">
                Recent Activity
              </h3>
              <p className="text-[11px] text-muted-foreground/60">
                Latest touchpoints across your portfolio
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setActiveView("accounts")}
            className="text-[11px] text-muted-foreground/60 hover:text-foreground h-7"
          >
            View all
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {recentActivity.map((account) => {
            const accountActivities = getActivitiesForAccount(account.id);
            const latestEvent = accountActivities[0];
            return (
              <button
                key={account.id}
                onClick={() => handleAccountClick(account.id)}
                className="p-3 bg-secondary/30 rounded-md hover:bg-secondary/50 transition-colors cursor-pointer text-left group"
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div
                    className={cn(
                      "health-dot",
                      account.healthScore >= 80 && "health-success",
                      account.healthScore >= 50 && account.healthScore < 80 && "health-neutral",
                      account.healthScore >= 30 && account.healthScore < 50 && "health-warning",
                      account.healthScore < 30 && "health-critical"
                    )}
                  />
                  <span className="text-[12px] font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {account.name}
                  </span>
                </div>
                {latestEvent && (
                  <>
                    <p className="text-[11px] text-muted-foreground/60 truncate">
                      {latestEvent.title}
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground/40 mt-1">
                      {formatRelativeTime(latestEvent.timestamp)}
                    </p>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
