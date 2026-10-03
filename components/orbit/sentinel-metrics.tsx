"use client";

import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Percent,
  Activity,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CountUp } from "./count-up";

interface MetricCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon: typeof DollarSign;
  accentColor?: "primary" | "success" | "warning" | "critical";
}

function MetricCard({
  label,
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  trend,
  trendValue,
  icon: Icon,
  accentColor = "primary",
}: MetricCardProps) {
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  const iconColors = {
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    critical: "text-critical",
  };

  return (
    <div className="p-5 bg-card rounded-md group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">
          {label}
        </span>
        <Icon className={cn("w-4 h-4", iconColors[accentColor])} strokeWidth={1.5} />
      </div>

      {/* Value */}
      <div className="mb-3">
        <CountUp
          end={value}
          prefix={prefix}
          suffix={suffix}
          decimals={decimals}
          className="text-2xl font-semibold text-foreground font-mono tracking-tight"
        />
      </div>

      {/* Trend - minimal */}
      {trend && trendValue && (
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex items-center gap-1 text-[11px] font-medium",
              trend === "up" && "text-success",
              trend === "down" && "text-critical",
              trend === "neutral" && "text-muted-foreground"
            )}
          >
            <TrendIcon className="w-3 h-3" />
            {trendValue}
          </span>
          <span className="text-[10px] text-muted-foreground/50">vs last month</span>
        </div>
      )}
    </div>
  );
}

interface SentinelMetricsProps {
  totalArr: number;
  averageNrr: number;
  averageHealthScore: number;
  accountCount: number;
}

export function SentinelMetrics({
  totalArr,
  averageNrr,
  averageHealthScore,
  accountCount,
}: SentinelMetricsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <MetricCard
        label="Total Book of Business"
        value={totalArr / 1000000}
        prefix="$"
        suffix="M"
        decimals={2}
        trend="up"
        trendValue="+8.2%"
        icon={DollarSign}
        accentColor="primary"
      />
      <MetricCard
        label="Net Retention Rate"
        value={averageNrr}
        suffix="%"
        decimals={0}
        trend="up"
        trendValue="+3.5%"
        icon={Percent}
        accentColor="success"
      />
      <MetricCard
        label="Avg Health Score"
        value={averageHealthScore}
        suffix="/100"
        decimals={0}
        trend={averageHealthScore >= 70 ? "up" : "down"}
        trendValue={averageHealthScore >= 70 ? "+2.1" : "-2.1"}
        icon={Activity}
        accentColor={
          averageHealthScore >= 70
            ? "success"
            : averageHealthScore >= 50
              ? "warning"
              : "critical"
        }
      />
      <MetricCard
        label="Active Accounts"
        value={accountCount}
        decimals={0}
        trend="neutral"
        trendValue="0"
        icon={Users}
        accentColor="primary"
      />
    </div>
  );
}
