"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { churnData as rawChurnData, type ChurnDataPoint } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

// Validate churn data
const churnData: ChurnDataPoint[] = rawChurnData.map(point => ({
  month: point.month || 'N/A',
  predicted: typeof point.predicted === 'number' && !isNaN(point.predicted) ? point.predicted : 2.0,
  actual: point.actual === null ? null : (typeof point.actual === 'number' && !isNaN(point.actual) ? point.actual : null),
}));

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
  hiddenSeries: Set<string>;
}

function CustomTooltip({ active, payload, label, hiddenSeries }: CustomTooltipProps) {
  if (!active || !payload) return null;

  const visiblePayload = payload.filter(p => !hiddenSeries.has(p.dataKey));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-popover p-3 rounded-md shadow-lg"
    >
      <p className="text-[11px] font-medium text-foreground mb-1.5">{label}</p>
      {visiblePayload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-[10px]">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground/70">{entry.name}:</span>
          <span className="font-mono font-medium text-foreground">
            {entry.value !== null ? `${entry.value}%` : "Pending"}
          </span>
        </div>
      ))}
    </motion.div>
  );
}

interface LegendItemProps {
  color: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function LegendItem({ color, label, isActive, onClick }: LegendItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-md transition-all duration-100",
        isActive 
          ? "hover:bg-secondary/40" 
          : "opacity-40 hover:opacity-60"
      )}
    >
      <div 
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color, opacity: isActive ? 1 : 0.5 }}
      />
      <span className={cn(
        "text-[11px] text-muted-foreground/70",
        !isActive && "line-through"
      )}>
        {label}
      </span>
    </button>
  );
}

export function ChurnRadarChart() {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  const toggleSeries = (key: string) => {
    setHiddenSeries(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const isPredictedVisible = !hiddenSeries.has('predicted');
  const isActualVisible = !hiddenSeries.has('actual');

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[13px] font-medium text-foreground">
            Churn Prediction Radar
          </h3>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">
            12-month forecast vs actual
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          <LegendItem
            color="#0066FF"
            label="Predicted"
            isActive={isPredictedVisible}
            onClick={() => toggleSeries('predicted')}
          />
          <LegendItem
            color="#22C55E"
            label="Actual"
            isActive={isActualVisible}
            onClick={() => toggleSeries('actual')}
          />
        </div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={churnData}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0066FF" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#0066FF" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22C55E" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(0,0,0,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              stroke="rgba(0,0,0,0.3)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              dy={8}
            />
            <YAxis
              stroke="rgba(0,0,0,0.3)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
              dx={-5}
              domain={[0, 4]}
            />
            <Tooltip content={<CustomTooltip hiddenSeries={hiddenSeries} />} />
            {isPredictedVisible && (
              <Area
                type="monotone"
                dataKey="predicted"
                stroke="#0066FF"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#colorPredicted)"
                name="Predicted"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: "#0066FF",
                  stroke: "#FFFFFF",
                  strokeWidth: 2,
                }}
                animationDuration={600}
                animationEasing="ease-out"
              />
            )}
            {isActualVisible && (
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#22C55E"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#colorActual)"
                name="Actual"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: "#22C55E",
                  stroke: "#FFFFFF",
                  strokeWidth: 2,
                }}
                connectNulls={false}
                animationDuration={600}
                animationEasing="ease-out"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
