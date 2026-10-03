'use client'

import React from "react"

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Pencil, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CountUp } from './count-up'

interface EditableMetricCardProps {
  label: string
  value: number
  suffix?: string
  prefix?: string
  onSave: (value: number) => void
  formatFn?: (value: number) => string
  colorClass?: string
  icon?: React.ReactNode
  readonly?: boolean
}

export function EditableMetricCard({
  label,
  value,
  suffix = '',
  prefix = '',
  onSave,
  formatFn,
  colorClass = 'text-foreground',
  icon,
  readonly = false,
}: EditableMetricCardProps) {
  // Ensure value is a valid number
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0
  
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(safeValue.toString())
  const [isHovered, setIsHovered] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = () => {
    const numValue = parseFloat(editValue.replace(/[^0-9.-]/g, ''))
    if (!isNaN(numValue) && numValue !== safeValue) {
      onSave(numValue)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(safeValue.toString())
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const displayValue = formatFn ? formatFn(safeValue) : `${prefix}${safeValue.toLocaleString()}${suffix}`

  return (
    <motion.div
      className={cn(
        'card-surface p-4 relative group cursor-pointer transition-all duration-200',
        isEditing && 'ring-2 ring-primary/30'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
    >
      {/* Edit button */}
      {!readonly && (
        <AnimatePresence>
          {isHovered && !isEditing && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={() => setIsEditing(true)}
              className="absolute top-2 right-2 p-1.5 rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <Pencil className="w-3 h-3 text-muted-foreground" />
            </motion.button>
          )}
        </AnimatePresence>
      )}

      {/* Icon */}
      {icon && (
        <div className="mb-2 text-muted-foreground">
          {icon}
        </div>
      )}

      {/* Value */}
      <div className="min-h-[36px]">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-9 px-2 bg-background border border-border rounded-md text-lg font-bold font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={handleSave}
              className="p-1.5 rounded-md bg-success/10 hover:bg-success/20 text-success transition-colors"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1.5 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className={cn('text-2xl font-bold font-mono tracking-tight', colorClass)}>
            <CountUp end={safeValue} prefix={prefix} suffix={suffix} formatFn={formatFn} />
          </div>
        )}
      </div>

      {/* Label */}
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </motion.div>
  )
}
