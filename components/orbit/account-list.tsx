'use client'

import React from "react"

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronDown, Plus, Eye, EyeOff, PanelLeftClose, PanelLeft, AlertTriangle, Building2, Heart, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOrbit, type FilterChip } from './orbit-provider'
import { 
  formatCurrency, 
  formatRelativeTime, 
  getHealthStatus,
  type Account 
} from '@/lib/mock-data'

interface AccountListProps {
  selectedAccountId: string | null
  onSelectAccount: (account: Account) => void
  onNewAccount: () => void
}

type SortOption = 'arr' | 'health' | 'activity' | 'name'

const filterChipConfig: { id: FilterChip; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'All', icon: <Sparkles className="w-3 h-3" /> },
  { id: 'at-risk', label: 'At Risk', icon: <AlertTriangle className="w-3 h-3" /> },
  { id: 'enterprise', label: 'Enterprise', icon: <Building2 className="w-3 h-3" /> },
  { id: 'healthy', label: 'Healthy', icon: <Heart className="w-3 h-3" /> },
]

export function AccountList({ selectedAccountId, onSelectAccount, onNewAccount }: AccountListProps) {
  const { accounts, settings, sidebarCollapsed, setSidebarCollapsed, filterChip, setFilterChip } = useOrbit()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('arr')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  const filteredAndSortedAccounts = useMemo(() => {
    let filtered = [...accounts]

    // Filter out archived unless showing
    if (!showArchived) {
      filtered = filtered.filter(acc => acc.status !== 'archived')
    }

    // Apply filter chip
    switch (filterChip) {
      case 'at-risk':
        filtered = filtered.filter(acc => acc.healthScore < 50 || acc.churnRisk === 'high')
        break
      case 'enterprise':
        filtered = filtered.filter(acc => acc.tier === 'enterprise')
        break
      case 'healthy':
        filtered = filtered.filter(acc => acc.healthScore >= 70)
        break
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (acc) =>
          acc.name.toLowerCase().includes(query) ||
          acc.industry.toLowerCase().includes(query)
      )
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'arr':
          return b.arr - a.arr
        case 'health':
          return b.healthScore - a.healthScore
        case 'activity':
          return b.lastActivity.getTime() - a.lastActivity.getTime()
        case 'name':
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })

    return filtered
  }, [accounts, searchQuery, sortBy, showArchived, filterChip])

  const archivedCount = useMemo(() => 
    accounts.filter(acc => acc.status === 'archived').length
  , [accounts])

  const sortLabels: Record<SortOption, string> = {
    arr: 'ARR',
    health: 'Health',
    activity: 'Activity',
    name: 'Name',
  }

  // Collapsed state
  if (sidebarCollapsed) {
    return (
      <motion.div 
        initial={{ width: 280 }}
        animate={{ width: 56 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="h-full flex flex-col bg-card/50"
      >
        {/* Expand button */}
        <div className="p-2.5 flex justify-center">
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-secondary/60 transition-colors"
            title="Expand sidebar"
          >
            <PanelLeft className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        
        {/* New account button */}
        <div className="px-2.5 pb-3 flex justify-center">
          <button
            onClick={onNewAccount}
            className="w-9 h-9 flex items-center justify-center rounded-md bg-primary/8 hover:bg-primary/12 transition-colors"
            title="New account"
          >
            <Plus className="w-4 h-4 text-primary" />
          </button>
        </div>

        {/* Compact account list */}
        <div className="flex-1 overflow-y-auto py-1">
          {filteredAndSortedAccounts.map((account) => {
            const isSelected = selectedAccountId === account.id
            const healthStatus = getHealthStatus(account.healthScore, settings.healthThresholds)
            const isAtRisk = account.healthScore < 40

            return (
              <button
                key={account.id}
                onClick={() => onSelectAccount(account)}
                className={cn(
                  'w-full py-2 flex items-center justify-center transition-all duration-100 relative group',
                  isSelected
                    ? 'bg-primary/6'
                    : 'hover:bg-secondary/40'
                )}
                title={`${account.name} - ${formatCurrency(account.arr)}`}
              >
                {isSelected && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-primary rounded-r-full" />
                )}
                <div className="relative">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-semibold',
                      healthStatus === 'healthy' && 'bg-success/10 text-success',
                      healthStatus === 'neutral' && 'bg-neutral/10 text-neutral',
                      healthStatus === 'at-risk' && 'bg-warning/10 text-warning',
                      healthStatus === 'critical' && 'bg-critical/10 text-critical'
                    )}
                  >
                    {account.name.charAt(0)}
                  </div>
                  {isAtRisk && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-critical rounded-full" />
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="p-3 flex justify-center">
          <span className="text-[10px] font-mono text-muted-foreground/60">
            {filteredAndSortedAccounts.length}
          </span>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div 
      initial={{ width: 56 }}
      animate={{ width: 280 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="h-full flex flex-col bg-card/50"
    >
      {/* Header */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-foreground tracking-tight">
            Accounts
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={onNewAccount}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/8 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </button>
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="p-1 rounded-md hover:bg-secondary/60 transition-colors"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4 text-muted-foreground/70" />
            </button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-3 bg-secondary/40 rounded-md text-[12px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:bg-secondary/60 transition-colors"
          />
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-1">
          {filterChipConfig.map((chip) => (
            <button
              key={chip.id}
              onClick={() => setFilterChip(chip.id)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md transition-all duration-100',
                filterChip === chip.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              )}
            >
              {chip.icon}
              {chip.label}
            </button>
          ))}
        </div>

        {/* Sort row */}
        <div className="flex items-center justify-between pt-1">
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground/70 hover:text-muted-foreground transition-colors"
            >
              Sort by: <span className="text-foreground/80 font-medium">{sortLabels[sortBy]}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            <AnimatePresence>
              {showSortMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowSortMenu(false)} 
                  />
                  <motion.div 
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.1 }}
                    className="absolute top-full left-0 mt-1 py-1 bg-popover rounded-md shadow-lg z-20 min-w-[100px]"
                  >
                    {(Object.keys(sortLabels) as SortOption[]).map((option) => (
                      <button
                        key={option}
                        onClick={() => {
                          setSortBy(option)
                          setShowSortMenu(false)
                        }}
                        className={cn(
                          'w-full px-3 py-1.5 text-left text-[11px] transition-colors',
                          sortBy === option
                            ? 'bg-primary/8 text-primary'
                            : 'text-foreground hover:bg-secondary/50'
                        )}
                      >
                        {sortLabels[option]}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {archivedCount > 0 && (
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={cn(
                'flex items-center gap-1 text-[11px] transition-colors',
                showArchived ? 'text-primary' : 'text-muted-foreground/60 hover:text-muted-foreground'
              )}
            >
              {showArchived ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              {archivedCount}
            </button>
          )}
        </div>
      </div>

      {/* Account list */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {filteredAndSortedAccounts.map((account) => {
            const isSelected = selectedAccountId === account.id
            const healthStatus = getHealthStatus(account.healthScore, settings.healthThresholds)
            const isArchived = account.status === 'archived'
            const isAtRisk = account.healthScore < 40

            return (
              <motion.button
                key={account.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.1 }}
                onClick={() => onSelectAccount(account)}
                className={cn(
                  'w-full px-4 py-3 text-left transition-all duration-100 relative group',
                  isSelected
                    ? 'bg-primary/5'
                    : 'hover:bg-secondary/30',
                  isArchived && 'opacity-50'
                )}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-8 bg-primary rounded-r-full" />
                )}
                
                {/* At risk indicator */}
                {isAtRisk && !isArchived && (
                  <span className="absolute left-1 top-3.5 w-1 h-1 bg-critical rounded-full" />
                )}
                
                <div className="flex items-start gap-2.5">
                  {/* Health indicator */}
                  <div className="mt-1.5">
                    <div
                      className={cn(
                        'health-dot',
                        healthStatus === 'healthy' && 'health-success',
                        healthStatus === 'neutral' && 'health-neutral',
                        healthStatus === 'at-risk' && 'health-warning',
                        healthStatus === 'critical' && 'health-critical'
                      )}
                    />
                  </div>

                  {/* Account info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className="text-[13px] font-medium text-foreground truncate">
                          {account.name}
                        </h3>
                        {isArchived && (
                          <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-medium rounded bg-muted text-muted-foreground/70">
                            Archived
                          </span>
                        )}
                        {account.churnRisk === 'high' && !isArchived && (
                          <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-medium rounded badge-critical">
                            At Risk
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground/70 shrink-0">
                        {formatCurrency(account.arr)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[11px] text-muted-foreground/60">
                        {account.industry}
                      </span>
                      <span className="text-[10px] text-muted-foreground/50 font-mono">
                        {formatRelativeTime(account.lastActivity)}
                      </span>
                    </div>

                    {/* Health score bar - minimal */}
                    <div className="mt-2 h-[3px] bg-secondary/60 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${account.healthScore}%` }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        className={cn(
                          'h-full rounded-full',
                          healthStatus === 'healthy' && 'bg-success',
                          healthStatus === 'neutral' && 'bg-neutral',
                          healthStatus === 'at-risk' && 'bg-warning',
                          healthStatus === 'critical' && 'bg-critical'
                        )}
                      />
                    </div>
                  </div>
                </div>
              </motion.button>
            )
          })}
        </AnimatePresence>

        {filteredAndSortedAccounts.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-muted-foreground/60 text-[12px] mb-3">
              {searchQuery ? `No accounts found for "${searchQuery}"` : 'No accounts match this filter'}
            </p>
            {!searchQuery && (
              <button
                onClick={onNewAccount}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-primary hover:bg-primary/8 rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Account
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer stats - minimal */}
      <div className="px-4 py-3 bg-secondary/20">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground/60">
            {filteredAndSortedAccounts.filter(a => a.status !== 'archived').length} accounts
          </span>
          <span className="font-mono text-foreground/70 font-medium">
            {formatCurrency(
              filteredAndSortedAccounts
                .filter(a => a.status !== 'archived')
                .reduce((sum, acc) => sum + acc.arr, 0)
            )}
          </span>
        </div>
      </div>
    </motion.div>
  )
}
