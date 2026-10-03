'use client'

import React from "react"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Check, Mail, MessageSquare, Phone, Video, Headphones, LogIn, FileText, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOrbit } from '../orbit-provider'
import { useToastActions } from '../toast-provider'
import { type TimelineEvent, type EventType, activityTags } from '@/lib/mock-data'

interface ActivityModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  activity?: TimelineEvent // If provided, it's edit mode
}

const eventTypes: { type: EventType; icon: typeof Mail; label: string }[] = [
  { type: 'email', icon: Mail, label: 'Email' },
  { type: 'meeting', icon: Video, label: 'Meeting' },
  { type: 'call', icon: Phone, label: 'Call' },
  { type: 'slack', icon: MessageSquare, label: 'Slack' },
  { type: 'support', icon: Headphones, label: 'Support' },
  { type: 'login', icon: LogIn, label: 'Login' },
  { type: 'note', icon: FileText, label: 'Note' },
  { type: 'other', icon: MoreHorizontal, label: 'Other' },
]

const healthImpactOptions = [
  { value: 10, label: 'Positive (+10)' },
  { value: 5, label: 'Slightly Positive (+5)' },
  { value: 0, label: 'Neutral (0)' },
  { value: -5, label: 'Slightly Negative (-5)' },
  { value: -10, label: 'Negative (-10)' },
]

export function ActivityModal({ isOpen, onClose, accountId, activity }: ActivityModalProps) {
  const { addActivity, updateActivity } = useOrbit()
  const toast = useToastActions()
  const isEditMode = !!activity

  const [formData, setFormData] = useState({
    type: 'email' as EventType,
    title: '',
    description: '',
    timestamp: new Date().toISOString().slice(0, 16),
    tags: [] as string[],
    healthImpact: 0,
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (activity) {
        setFormData({
          type: activity.type,
          title: activity.title,
          description: activity.description,
          timestamp: activity.timestamp.toISOString().slice(0, 16),
          tags: activity.tags || [],
          healthImpact: activity.healthImpact || 0,
        })
      } else {
        setFormData({
          type: 'email',
          title: '',
          description: '',
          timestamp: new Date().toISOString().slice(0, 16),
          tags: [],
          healthImpact: 0,
        })
      }
    }
  }, [isOpen, activity])

  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Please fill in all required fields')
      return
    }
    
    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 200))
    
    try {
      if (isEditMode && activity) {
        updateActivity(activity.id, {
          type: formData.type,
          title: formData.title,
          description: formData.description,
          timestamp: new Date(formData.timestamp),
          tags: formData.tags.length > 0 ? formData.tags : undefined,
          healthImpact: formData.healthImpact !== 0 ? formData.healthImpact : undefined,
        })
        toast.success('Activity updated')
      } else {
        addActivity({
          accountId,
          type: formData.type,
          title: formData.title,
          description: formData.description,
          timestamp: new Date(formData.timestamp),
          tags: formData.tags.length > 0 ? formData.tags : undefined,
          healthImpact: formData.healthImpact !== 0 ? formData.healthImpact : undefined,
        })
        toast.success('Activity logged')
      }
      onClose()
    } catch {
      toast.error('Failed to save activity')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = formData.title.trim() && formData.description.trim()

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-lg mx-4 bg-background border border-border rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground tracking-tight-ui">
                {isEditMode ? 'Edit Activity' : 'Log Activity'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Activity Type */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Activity Type <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {eventTypes.map(({ type, icon: Icon, label }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type }))}
                      className={cn(
                        'flex flex-col items-center gap-1 p-3 rounded-lg border transition-all',
                        formData.type === type
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="e.g., QBR Meeting"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Description <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Describe what happened..."
                />
                <p className="mt-1 text-xs text-muted-foreground text-right">
                  {formData.description.length}/500
                </p>
              </div>

              {/* Date & Time */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Date & Time <span className="text-destructive">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.timestamp}
                  onChange={(e) => setFormData(prev => ({ ...prev, timestamp: e.target.value }))}
                  className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {activityTags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                        formData.tags.includes(tag)
                          ? 'bg-primary text-white'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Health Impact */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Health Impact
                </label>
                <select
                  value={formData.healthImpact}
                  onChange={(e) => setFormData(prev => ({ ...prev, healthImpact: parseInt(e.target.value) }))}
                  className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {healthImpactOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </form>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/30">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={!isFormValid || isSubmitting}
                className={cn(
                  'px-4 py-2 text-sm font-medium text-white rounded-lg transition-all flex items-center gap-2',
                  isFormValid && !isSubmitting
                    ? 'bg-primary hover:bg-primary/90'
                    : 'bg-primary/50 cursor-not-allowed'
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {isEditMode ? 'Update' : 'Log Activity'}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
