'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

// Base skeleton element with shimmer effect
export function Skeleton({ className }: { className?: string }) {
  return (
    <div 
      className={cn(
        'animate-pulse rounded-md bg-muted/60',
        className
      )} 
    />
  )
}

// Account card skeleton
export function AccountCardSkeleton() {
  return (
    <div className="p-3 border-b border-border/50">
      <div className="flex items-start gap-3">
        <Skeleton className="w-2 h-2 rounded-full mt-2" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-1 w-full rounded-full" />
        </div>
      </div>
    </div>
  )
}

// Metric card skeleton
export function MetricCardSkeleton() {
  return (
    <div className="card-surface p-4">
      <Skeleton className="w-6 h-6 mb-2" />
      <Skeleton className="h-8 w-24 mb-2" />
      <Skeleton className="h-3 w-16" />
    </div>
  )
}

// Timeline event skeleton
export function TimelineEventSkeleton() {
  return (
    <div className="relative pl-10">
      <Skeleton className="absolute left-0 w-8 h-8 rounded-full" />
      <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-5 w-14 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4 mt-1" />
      </div>
    </div>
  )
}

// Contact card skeleton
export function ContactCardSkeleton() {
  return (
    <div className="card-surface p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </div>
    </div>
  )
}

// Health gauge skeleton
export function HealthGaugeSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 80, md: 120, lg: 160 }
  const width = sizeMap[size]
  
  return (
    <div className="flex flex-col items-center">
      <Skeleton className="rounded-full" style={{ width, height: width / 2 + 10 }} />
      <Skeleton className="h-5 w-16 mt-2 rounded-full" />
    </div>
  )
}

// Chart skeleton
export function ChartSkeleton() {
  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
      <div className="h-[300px] flex items-end gap-4 px-8">
        {[...Array(12)].map((_, i) => (
          <Skeleton 
            key={i} 
            className="flex-1" 
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </div>
  )
}

// Full account deep dive skeleton
export function AccountDeepDiveSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          <HealthGaugeSkeleton size="lg" />
          <div className="space-y-3">
            <ContactCardSkeleton />
            <ContactCardSkeleton />
          </div>
        </div>

        {/* Middle column - timeline */}
        <div className="col-span-2 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-16 rounded-md" />
            ))}
          </div>
          <TimelineEventSkeleton />
          <TimelineEventSkeleton />
          <TimelineEventSkeleton />
        </div>
      </div>
    </motion.div>
  )
}

// Loading overlay with spinner
export function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <div className="flex flex-col items-center gap-3">
        <motion.div
          className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </motion.div>
  )
}
