'use client'

import React from "react"

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, MessageSquare, LogIn, Phone, Calendar, HelpCircle, FileText, MoreHorizontal, Pencil, Trash2, Clock, Plus, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOrbit } from './orbit-provider'
import { useToastActions } from './toast-provider'
import { ActivityModal } from './modals/activity-modal'
import { ConfirmModal } from './modals/confirm-modal'
import type { TimelineEvent, EventType } from '@/lib/mock-data'

interface TimelineOfTruthProps {
  events: TimelineEvent[]
  accountId: string
}

type FilterTab = 'all' | 'notes' | 'meetings' | 'support'

const filterTabs: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'notes', label: 'Notes' },
  { id: 'meetings', label: 'Meetings' },
  { id: 'support', label: 'Support' },
]

const filterMapping: Record<FilterTab, EventType[]> = {
  all: ['email', 'slack', 'login', 'call', 'meeting', 'support', 'note', 'other'],
  notes: ['note', 'email', 'slack'],
  meetings: ['meeting', 'call'],
  support: ['support'],
}

const eventConfig: Record<
  EventType,
  { icon: typeof Mail; label: string; color: string; bgColor: string }
> = {
  email: {
    icon: Mail,
    label: 'Email',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  slack: {
    icon: MessageSquare,
    label: 'Slack',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  login: {
    icon: LogIn,
    label: 'Login',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  call: {
    icon: Phone,
    label: 'Call',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  meeting: {
    icon: Calendar,
    label: 'Meeting',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
  },
  support: {
    icon: HelpCircle,
    label: 'Support',
    color: 'text-rose-600',
    bgColor: 'bg-rose-100',
  },
  note: {
    icon: FileText,
    label: 'Note',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  other: {
    icon: MoreHorizontal,
    label: 'Other',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
}

function formatTimestamp(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffHours < 1) {
    const diffMins = Math.floor(diffMs / 60000)
    return `${diffMins}m ago`
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`
  }
  if (diffDays === 1) {
    return 'Yesterday'
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function TimelineOfTruth({ events, accountId }: TimelineOfTruthProps) {
  const { deleteActivity, addActivity } = useOrbit()
  const toast = useToastActions()
  
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [editingActivity, setEditingActivity] = useState<TimelineEvent | null>(null)
  const [deletingActivity, setDeletingActivity] = useState<TimelineEvent | null>(null)
  const [quickAddText, setQuickAddText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filter events based on active tab
  const filteredEvents = useMemo(() => {
    const allowedTypes = filterMapping[activeTab]
    return events.filter(e => allowedTypes.includes(e.type))
  }, [events, activeTab])

  const handleQuickAdd = async () => {
    if (!quickAddText.trim()) return
    setIsSubmitting(true)
    
    // Simulate a brief delay for UX
    await new Promise(resolve => setTimeout(resolve, 200))
    
    addActivity({
      accountId,
      type: 'note',
      title: 'Quick Note',
      description: quickAddText.trim(),
      timestamp: new Date(),
    })
    
    setQuickAddText('')
    setIsSubmitting(false)
    toast.success('Note added')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleQuickAdd()
    }
  }

  const handleDelete = () => {
    if (!deletingActivity) return
    deleteActivity(deletingActivity.id)
    toast.success('Activity deleted')
    setDeletingActivity(null)
  }

  return (
    <>
      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-border/50 pb-2">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150',
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Quick add input */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={quickAddText}
            onChange={(e) => setQuickAddText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Quick add a note..."
            className="flex-1 h-9 px-3 bg-muted/50 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          <motion.button
            onClick={handleQuickAdd}
            disabled={!quickAddText.trim() || isSubmitting}
            className={cn(
              'h-9 w-9 flex items-center justify-center rounded-lg transition-all',
              quickAddText.trim() && !isSubmitting
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
            whileTap={{ scale: 0.95 }}
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground mb-1">
            {events.length === 0 
              ? 'No activity logged yet' 
              : `No ${activeTab === 'all' ? '' : activeTab} activity found`}
          </p>
          <p className="text-xs text-muted-foreground">
            {events.length === 0 
              ? 'Log your first interaction to start building this account\'s history'
              : 'Try selecting a different filter'}
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredEvents.map((event, index) => {
                const config = eventConfig[event.type] || eventConfig.other
                const Icon = config.icon

                return (
                  <motion.div 
                    key={event.id} 
                    className="relative pl-10 group"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15, delay: index * 0.03 }}
                    layout
                  >
                    {/* Timeline dot */}
                    <div
                      className={cn(
                        'absolute left-0 w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:scale-110',
                        config.bgColor
                      )}
                    >
                      <Icon className={cn('w-4 h-4', config.color)} strokeWidth={1.5} />
                    </div>

                    {/* Content */}
                    <div className="bg-muted/30 rounded-lg p-3 border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-xs font-medium',
                              config.bgColor,
                              config.color
                            )}
                          >
                            {config.label}
                          </span>
                          <h4 className="text-sm font-medium text-foreground">
                            {event.title}
                          </h4>
                          {event.isSystemGenerated && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                              Auto
                            </span>
                          )}
                          {event.tags?.map(tag => (
                            <span key={tag} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Edit/Delete buttons - show on hover */}
                          {!event.isSystemGenerated && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setEditingActivity(event)}
                                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                aria-label="Edit activity"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingActivity(event)}
                                className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors"
                                aria-label="Delete activity"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          <span className="text-xs font-mono text-muted-foreground">
                            {formatTimestamp(event.timestamp)}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {event.description}
                      </p>
                      {event.healthImpact && event.healthImpact !== 0 && (
                        <span className={cn(
                          'inline-block mt-2 px-1.5 py-0.5 rounded text-[10px] font-medium',
                          event.healthImpact > 0 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        )}>
                          Health {event.healthImpact > 0 ? '+' : ''}{event.healthImpact}
                        </span>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Edit Activity Modal */}
      {editingActivity && (
        <ActivityModal
          isOpen={!!editingActivity}
          onClose={() => setEditingActivity(null)}
          accountId={accountId}
          activity={editingActivity}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deletingActivity}
        onClose={() => setDeletingActivity(null)}
        onConfirm={handleDelete}
        title="Delete Activity?"
        message={`Are you sure you want to delete "${deletingActivity?.title}"? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </>
  )
}
