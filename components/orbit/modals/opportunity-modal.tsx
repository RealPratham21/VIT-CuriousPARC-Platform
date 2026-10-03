'use client'

import React from "react"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOrbit } from '../orbit-provider'
import { useToastActions } from '../toast-provider'
import { type Opportunity, type OpportunityStatus } from '@/lib/mock-data'

interface OpportunityModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  opportunity?: Opportunity // If provided, it's edit mode
}

const statusOptions: { value: OpportunityStatus; label: string; color: string }[] = [
  { value: 'identified', label: 'Identified', color: 'bg-gray-100 text-gray-700' },
  { value: 'qualifying', label: 'Qualifying', color: 'bg-blue-100 text-blue-700' },
  { value: 'proposed', label: 'Proposed', color: 'bg-purple-100 text-purple-700' },
  { value: 'negotiating', label: 'Negotiating', color: 'bg-orange-100 text-orange-700' },
  { value: 'closed-won', label: 'Closed Won', color: 'bg-green-100 text-green-700' },
  { value: 'closed-lost', label: 'Closed Lost', color: 'bg-red-100 text-red-700' },
]

export function OpportunityModal({ isOpen, onClose, accountId, opportunity }: OpportunityModalProps) {
  const { addOpportunity, updateOpportunity, closeOpportunityWon } = useOrbit()
  const toast = useToastActions()
  const isEditMode = !!opportunity

  const [formData, setFormData] = useState({
    product: '',
    potentialArr: '',
    probability: 50,
    status: 'identified' as OpportunityStatus,
    expectedCloseDate: '',
    notes: '',
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCloseWonConfirm, setShowCloseWonConfirm] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (opportunity) {
        setFormData({
          product: opportunity.product,
          potentialArr: opportunity.potentialArr.toString(),
          probability: opportunity.probability,
          status: opportunity.status,
          expectedCloseDate: opportunity.expectedCloseDate 
            ? opportunity.expectedCloseDate.toISOString().slice(0, 10) 
            : '',
          notes: opportunity.notes || '',
        })
      } else {
        setFormData({
          product: '',
          potentialArr: '',
          probability: 50,
          status: 'identified',
          expectedCloseDate: '',
          notes: '',
        })
      }
    }
  }, [isOpen, opportunity])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.product.trim() || !formData.potentialArr) {
      toast.error('Please fill in all required fields')
      return
    }

    const potentialArr = parseFloat(formData.potentialArr)
    if (isNaN(potentialArr) || potentialArr < 1000) {
      toast.error('Potential ARR must be at least $1,000')
      return
    }

    // Check if status changed to closed-won and show confirmation
    if (isEditMode && opportunity && 
        formData.status === 'closed-won' && 
        opportunity.status !== 'closed-won') {
      setShowCloseWonConfirm(true)
      return
    }
    
    await saveOpportunity()
  }

  const saveOpportunity = async () => {
    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 200))
    
    try {
      const potentialArr = parseFloat(formData.potentialArr)
      
      if (isEditMode && opportunity) {
        // If closing won, use the special method
        if (formData.status === 'closed-won' && opportunity.status !== 'closed-won') {
          closeOpportunityWon(opportunity.id)
          toast.success(`${formData.product} closed won! ARR updated.`)
        } else {
          updateOpportunity(opportunity.id, {
            product: formData.product,
            potentialArr,
            probability: formData.probability,
            status: formData.status,
            expectedCloseDate: formData.expectedCloseDate 
              ? new Date(formData.expectedCloseDate) 
              : undefined,
            notes: formData.notes || undefined,
          })
          toast.success('Opportunity updated')
        }
      } else {
        addOpportunity({
          accountId,
          product: formData.product,
          potentialArr,
          probability: formData.probability,
          status: formData.status,
          expectedCloseDate: formData.expectedCloseDate 
            ? new Date(formData.expectedCloseDate) 
            : undefined,
          notes: formData.notes || undefined,
        })
        toast.success('Opportunity added')
      }
      onClose()
    } catch {
      toast.error('Failed to save opportunity')
    } finally {
      setIsSubmitting(false)
      setShowCloseWonConfirm(false)
    }
  }

  const isFormValid = formData.product.trim() && 
    formData.potentialArr && 
    parseFloat(formData.potentialArr) >= 1000

  const weightedValue = formData.potentialArr 
    ? (parseFloat(formData.potentialArr) * formData.probability / 100)
    : 0

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
            className="relative w-full max-w-md mx-4 bg-background border border-border rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground tracking-tight-ui">
                {isEditMode ? 'Edit Opportunity' : 'Add Opportunity'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {showCloseWonConfirm ? (
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Close as Won?
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    This will add ${parseFloat(formData.potentialArr).toLocaleString()} to the account's ARR and update NRR.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCloseWonConfirm(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-foreground bg-muted border border-border rounded-lg hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveOpportunity}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Confirm Close Won'
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  {/* Product/Service */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Product/Service <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.product}
                      onChange={(e) => setFormData(prev => ({ ...prev, product: e.target.value }))}
                      className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="e.g., Enterprise Analytics Add-on"
                    />
                  </div>

                  {/* Potential ARR */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Potential ARR <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <input
                        type="number"
                        value={formData.potentialArr}
                        onChange={(e) => setFormData(prev => ({ ...prev, potentialArr: e.target.value }))}
                        className="w-full h-10 pl-7 pr-3 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="50000"
                        min="1000"
                      />
                    </div>
                  </div>

                  {/* Probability Slider */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Probability: <span className="font-mono">{formData.probability}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={formData.probability}
                      onChange={(e) => setFormData(prev => ({ ...prev, probability: parseInt(e.target.value) }))}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Weighted Value Display */}
                  {formData.potentialArr && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Weighted Pipeline Value</p>
                      <p className="text-lg font-semibold font-mono text-foreground">
                        ${Math.round(weightedValue).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as OpportunityStatus }))}
                      className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      {statusOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Expected Close Date */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Expected Close Date
                    </label>
                    <input
                      type="date"
                      value={formData.expectedCloseDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, expectedCloseDate: e.target.value }))}
                      className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="Additional details..."
                    />
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
                        {isEditMode ? 'Update' : 'Add Opportunity'}
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
