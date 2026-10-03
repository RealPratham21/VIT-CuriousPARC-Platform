'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface HealthBreakdown {
  productUsage: number
  supportTickets: number
  engagement: number
  nps: number
  recentActivity: number
}

interface HealthGaugeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  breakdown?: HealthBreakdown
  className?: string
}

export function HealthGauge({ 
  score, 
  size = 'md', 
  showLabel = true,
  breakdown,
  className 
}: HealthGaugeProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  // Size configs - refined sizing
  const sizeConfig = {
    sm: { width: 72, strokeWidth: 5, fontSize: 'text-base', labelSize: 'text-[9px]' },
    md: { width: 100, strokeWidth: 6, fontSize: 'text-xl', labelSize: 'text-[10px]' },
    lg: { width: 140, strokeWidth: 8, fontSize: 'text-2xl', labelSize: 'text-[11px]' },
  }
  
  const config = sizeConfig[size]
  const radius = (config.width - config.strokeWidth) / 2
  const circumference = radius * Math.PI
  const strokeDashoffset = circumference - (score / 100) * circumference
  
  // Health status - cleaner colors
  const getStatusColor = (s: number) => {
    if (s >= 70) return { stroke: '#22C55E', text: 'text-success', label: 'Healthy' }
    if (s >= 50) return { stroke: '#94A3B8', text: 'text-muted-foreground', label: 'Stable' }
    if (s >= 30) return { stroke: '#F59E0B', text: 'text-warning', label: 'At Risk' }
    return { stroke: '#EF4444', text: 'text-critical', label: 'Critical' }
  }
  
  const status = getStatusColor(score)
  
  // Default breakdown
  const defaultBreakdown: HealthBreakdown = breakdown || {
    productUsage: Math.round(score * 0.3),
    supportTickets: score >= 70 ? -2 : score >= 50 ? -5 : -10,
    engagement: Math.round(score * 0.25),
    nps: score >= 70 ? 15 : score >= 50 ? 5 : -5,
    recentActivity: Math.round(score * 0.2),
  }
  
  const breakdownItems = [
    { label: 'Product Usage', value: defaultBreakdown.productUsage, positive: defaultBreakdown.productUsage > 0 },
    { label: 'Support Tickets', value: defaultBreakdown.supportTickets, positive: defaultBreakdown.supportTickets > 0 },
    { label: 'Engagement', value: defaultBreakdown.engagement, positive: defaultBreakdown.engagement > 0 },
    { label: 'NPS Score', value: defaultBreakdown.nps, positive: defaultBreakdown.nps > 0 },
    { label: 'Recent Activity', value: defaultBreakdown.recentActivity, positive: defaultBreakdown.recentActivity > 0 },
  ]

  const GaugeContent = (
    <div 
      className={cn('relative inline-flex flex-col items-center', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <svg
        width={config.width}
        height={config.width / 2 + 8}
        className="transform -rotate-180"
      >
        {/* Background arc - ultra minimal */}
        <circle
          cx={config.width / 2}
          cy={config.width / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={0}
          strokeLinecap="round"
          className="text-muted/20"
          transform={`rotate(180 ${config.width / 2} ${config.width / 2})`}
        />
        
        {/* Animated progress arc */}
        <motion.circle
          cx={config.width / 2}
          cy={config.width / 2}
          r={radius}
          fill="none"
          stroke={status.stroke}
          strokeWidth={config.strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          strokeLinecap="round"
          transform={`rotate(180 ${config.width / 2} ${config.width / 2})`}
        />
      </svg>
      
      {/* Score display */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-0">
        <motion.span 
          className={cn('font-semibold font-mono tracking-tight', config.fontSize, status.text)}
          style={{ paddingBottom: config.width * 0.15 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          {score}
        </motion.span>
        {showLabel && (
          <span className={cn('font-medium text-muted-foreground/60', config.labelSize)}>
            {status.label}
          </span>
        )}
      </div>
    </div>
  )

  // Wrap with tooltip for breakdown
  if (!breakdown) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {GaugeContent}
          </TooltipTrigger>
          <TooltipContent 
            side="bottom" 
            className="p-3 bg-popover shadow-lg"
          >
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-foreground mb-2">Health Breakdown</p>
              {breakdownItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-6 text-[10px]">
                  <span className="text-muted-foreground/70">{item.label}</span>
                  <span className={cn(
                    'font-mono font-medium',
                    item.positive ? 'text-success' : 'text-critical'
                  )}>
                    {item.positive ? '+' : ''}{item.value}
                  </span>
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return GaugeContent
}
