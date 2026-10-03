"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  DollarSign,
  Users,
  Calendar,
} from "lucide-react";
import { useOrbit } from "./orbit-provider";
import { formatCurrency } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const COLORS = ["#10B981", "#007AFF", "#F59E0B", "#EF4444", "#6B7280"];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
  label?: string;
}

function ChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload) return null;

  return (
    <div className="card-elevated p-3">
      {label && <p className="text-xs font-medium text-foreground mb-2">{label}</p>}
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-xs">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color || COLORS[index % COLORS.length] }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-mono font-medium text-foreground">
            {typeof entry.value === "number" && entry.value >= 1000
              ? formatCurrency(entry.value)
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsView() {
  const { accounts, opportunities, getPortfolioMetrics } = useOrbit();
  const metrics = getPortfolioMetrics();
  
  const activeAccounts = accounts.filter((acc) => acc.status !== 'archived');

  // ARR by tier
  const arrByTier = useMemo(() => {
    const tiers = { enterprise: 0, "mid-market": 0, startup: 0 };
    activeAccounts.forEach((acc) => {
      tiers[acc.tier] += acc.arr;
    });
    return [
      { name: "Enterprise", value: tiers.enterprise, color: "#007AFF" },
      { name: "Mid-Market", value: tiers["mid-market"], color: "#10B981" },
      { name: "Startup", value: tiers.startup, color: "#F59E0B" },
    ];
  }, [activeAccounts]);

  // Health distribution
  const healthDistribution = useMemo(() => {
    const dist = { healthy: 0, stable: 0, atRisk: 0, critical: 0 };
    activeAccounts.forEach((acc) => {
      if (acc.healthScore >= 80) dist.healthy++;
      else if (acc.healthScore >= 50) dist.stable++;
      else if (acc.healthScore >= 30) dist.atRisk++;
      else dist.critical++;
    });
    return [
      { name: "Healthy (80+)", value: dist.healthy, color: "#10B981" },
      { name: "Stable (50-79)", value: dist.stable, color: "#007AFF" },
      { name: "At Risk (30-49)", value: dist.atRisk, color: "#F59E0B" },
      { name: "Critical (<30)", value: dist.critical, color: "#EF4444" },
    ];
  }, [activeAccounts]);

  // Industry breakdown
  const industryBreakdown = useMemo(() => {
    const industries: Record<string, { arr: number; count: number }> = {};
    activeAccounts.forEach((acc) => {
      if (!industries[acc.industry]) {
        industries[acc.industry] = { arr: 0, count: 0 };
      }
      industries[acc.industry].arr += acc.arr;
      industries[acc.industry].count++;
    });
    return Object.entries(industries)
      .map(([name, data]) => ({
        name,
        arr: data.arr,
        count: data.count,
      }))
      .sort((a, b) => b.arr - a.arr);
  }, [activeAccounts]);

  // Monthly activity trend (simulated)
  const activityTrend = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    return months.map((month, i) => ({
      month,
      activities: 20 + Math.floor(Math.random() * 30) + i * 3,
      engagements: 15 + Math.floor(Math.random() * 20) + i * 2,
    }));
  }, []);

  // Pipeline by stage - use opportunities from context
  const pipelineByStage = useMemo(() => {
    const stages: Record<string, number> = {
      identified: 0,
      qualified: 0,
      proposed: 0,
      negotiation: 0,
      closed_won: 0,
    };
    // Filter opportunities for active accounts only
    const activeAccountIds = new Set(activeAccounts.map(acc => acc.id));
    opportunities
      .filter(opp => activeAccountIds.has(opp.accountId))
      .forEach((opp) => {
        if (stages[opp.status] !== undefined) {
          stages[opp.status] += opp.potentialArr;
        }
      });
    return [
      { stage: "Identified", value: stages.identified },
      { stage: "Qualified", value: stages.qualified },
      { stage: "Proposed", value: stages.proposed },
      { stage: "Negotiation", value: stages.negotiation },
      { stage: "Won", value: stages.closed_won },
    ];
  }, [activeAccounts, opportunities]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Portfolio insights and performance metrics
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-surface p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Total ARR
              </p>
              <p className="text-2xl font-semibold font-mono text-foreground mt-1">
                {formatCurrency(metrics.totalArr)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="w-3.5 h-3.5 text-success" />
            <span className="text-xs text-success font-medium">+12.5%</span>
            <span className="text-xs text-muted-foreground">vs last quarter</span>
          </div>
        </div>

        <div className="card-surface p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Accounts
              </p>
              <p className="text-2xl font-semibold font-mono text-foreground mt-1">
                {metrics.accountCount}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-success" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="w-3.5 h-3.5 text-success" />
            <span className="text-xs text-success font-medium">+3</span>
            <span className="text-xs text-muted-foreground">new this month</span>
          </div>
        </div>

        <div className="card-surface p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Avg Health
              </p>
              <p className="text-2xl font-semibold font-mono text-foreground mt-1">
                {metrics.averageHealthScore}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Activity className="w-5 h-5 text-warning" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2">
            <TrendingDown className="w-3.5 h-3.5 text-destructive" />
            <span className="text-xs text-destructive font-medium">-2.1</span>
            <span className="text-xs text-muted-foreground">vs last month</span>
          </div>
        </div>

        <div className="card-surface p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">
                NRR
              </p>
              <p className="text-2xl font-semibold font-mono text-foreground mt-1">
                {metrics.averageNrr}%
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="w-3.5 h-3.5 text-success" />
            <span className="text-xs text-success font-medium">+3.5%</span>
            <span className="text-xs text-muted-foreground">vs last quarter</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ARR by Tier */}
        <div className="card-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <PieChartIcon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">ARR by Tier</h3>
              <p className="text-xs text-muted-foreground">Revenue distribution</p>
            </div>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={arrByTier}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {arrByTier.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {arrByTier.map((tier) => (
              <div key={tier.name} className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: tier.color }}
                />
                <span className="text-xs text-muted-foreground">{tier.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Health Distribution */}
        <div className="card-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Health Distribution
              </h3>
              <p className="text-xs text-muted-foreground">Account health breakdown</p>
            </div>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={healthDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {healthDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {healthDistribution.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-muted-foreground">
                  {item.name}: {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Industry Breakdown */}
        <div className="card-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                ARR by Industry
              </h3>
              <p className="text-xs text-muted-foreground">Revenue by vertical</p>
            </div>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={industryBreakdown}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis
                  type="number"
                  stroke="rgba(0,0,0,0.4)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatCurrency(v)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="rgba(0,0,0,0.4)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="arr" name="ARR" fill="#007AFF" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Trend */}
        <div className="card-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Calendar className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Activity Trend</h3>
              <p className="text-xs text-muted-foreground">Monthly touchpoints</p>
            </div>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={activityTrend}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis
                  dataKey="month"
                  stroke="rgba(0,0,0,0.4)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="rgba(0,0,0,0.4)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="activities"
                  name="Activities"
                  stroke="#007AFF"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#007AFF" }}
                />
                <Line
                  type="monotone"
                  dataKey="engagements"
                  name="Engagements"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#10B981" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-xs text-muted-foreground">Activities</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span className="text-xs text-muted-foreground">Engagements</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Funnel */}
      <div className="card-surface p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Expansion Pipeline
            </h3>
            <p className="text-xs text-muted-foreground">
              Opportunity value by stage
            </p>
          </div>
        </div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={pipelineByStage}
              margin={{ top: 10, right: 20, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis
                dataKey="stage"
                stroke="rgba(0,0,0,0.4)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="rgba(0,0,0,0.4)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatCurrency(v)}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="value"
                name="Pipeline Value"
                fill="#007AFF"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
