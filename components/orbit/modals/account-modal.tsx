'use client'

import React from "react"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOrbit } from '../orbit-provider'
import { useToastActions } from '../toast-provider'
import { 
  type Account, 
  type Tier, 
  type Industry,
  type AccountStatus,
  industries, 
  isValidEmail, 
  isValidUrl 
} from '@/lib/mock-data'

interface AccountModalProps {
  isOpen: boolean
  onClose: () => void
  account?: Account // If provided, it's edit mode
  onSuccess?: (account: Account) => void
}

interface FormData {
  name: string
  industry: Industry
  tier: Tier
  arr: string
  csmOwner: string
  website: string
  primaryContactName: string
  primaryContactEmail: string
  status: AccountStatus
}

interface FormErrors {
  name?: string
  arr?: string
  primaryContactEmail?: string
  website?: string
}

const tiers: { value: Tier; label: string }[] = [
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'mid-market', label: 'Mid-Market' },
  { value: 'startup', label: 'Startup' },
]

const statuses: { value: AccountStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'at-risk', label: 'At Risk' },
  { value: 'churned', label: 'Churned' },
]

export function AccountModal({ isOpen, onClose, account, onSuccess }: AccountModalProps) {
  const { addAccount, updateAccount, teamMembers, addContact } = useOrbit()
  const toast = useToastActions()
  const isEditMode = !!account

  const [formData, setFormData] = useState<FormData>({
    name: '',
    industry: 'Technology',
    tier: 'mid-market',
    arr: '',
    csmOwner: '',
    website: '',
    primaryContactName: '',
    primaryContactEmail: '',
    status: 'active',
  })
  
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Reset form when opening or account changes
  useEffect(() => {
    if (isOpen) {
      if (account) {
        setFormData({
          name: account.name,
          industry: account.industry,
          tier: account.tier,
          arr: account.arr.toString(),
          csmOwner: account.csmOwner || '',
          website: account.website || '',
          primaryContactName: '',
          primaryContactEmail: '',
          status: account.status,
        })
      } else {
        setFormData({
          name: '',
          industry: 'Technology',
          tier: 'mid-market',
          arr: '',
          csmOwner: teamMembers[0]?.id || '',
          website: '',
          primaryContactName: '',
          primaryContactEmail: '',
          status: 'active',
        })
      }
      setErrors({})
      setTouched({})
    }
  }, [isOpen, account, teamMembers])

  const validateField = (field: keyof FormData, value: string): string | undefined => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Company name is required'
        break
      case 'arr':
        const numValue = parseFloat(value)
        if (!value || isNaN(numValue)) return 'ARR is required'
        if (numValue < 1000) return 'ARR must be at least $1,000'
        break
      case 'primaryContactEmail':
        if (value && !isValidEmail(value)) return 'Please enter a valid email address'
        break
      case 'website':
        if (value && !isValidUrl(value)) return 'Please enter a valid URL (e.g., https://example.com)'
        break
    }
    return undefined
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    
    newErrors.name = validateField('name', formData.name)
    newErrors.arr = validateField('arr', formData.arr)
    newErrors.primaryContactEmail = validateField('primaryContactEmail', formData.primaryContactEmail)
    newErrors.website = validateField('website', formData.website)
    
    setErrors(newErrors)
    return !Object.values(newErrors).some(Boolean)
  }

  const handleBlur = (field: keyof FormData) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    const error = validateField(field, formData[field])
    setErrors(prev => ({ ...prev, [field]: error }))
  }

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (touched[field]) {
      const error = validateField(field, value)
      setErrors(prev => ({ ...prev, [field]: error }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsSubmitting(true)
    
    // Simulate a brief delay for UX
    await new Promise(resolve => setTimeout(resolve, 300))
    
    try {
      if (isEditMode && account) {
        updateAccount(account.id, {
          name: formData.name,
          industry: formData.industry,
          tier: formData.tier,
          arr: parseFloat(formData.arr),
          csmOwner: formData.csmOwner || undefined,
          website: formData.website || undefined,
          status: formData.status,
        })
        toast.success(`${formData.name} updated successfully`)
        onSuccess?.(account)
      } else {
        const newAccount = addAccount({
          name: formData.name,
          industry: formData.industry,
          tier: formData.tier,
          arr: parseFloat(formData.arr),
          baselineArr: parseFloat(formData.arr),
          csmOwner: formData.csmOwner || undefined,
          website: formData.website || undefined,
          status: 'active',
          lastActivity: new Date(),
        })
        
        // Add primary contact if provided
        if (formData.primaryContactName && formData.primaryContactEmail) {
          addContact({
            accountId: newAccount.id,
            name: formData.primaryContactName,
            email: formData.primaryContactEmail,
            role: 'Primary Contact',
            isPrimary: true,
            isChampion: false,
          })
        }
        
        toast.success(`${formData.name} added successfully`)
        onSuccess?.(newAccount)
      }
      
      onClose()
    } catch {
      toast.error('Failed to save. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = formData.name.trim() && 
    formData.arr && 
    parseFloat(formData.arr) >= 1000 &&
    (!formData.primaryContactEmail || isValidEmail(formData.primaryContactEmail)) &&
    (!formData.website || isValidUrl(formData.website))

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-lg mx-4 bg-background border border-border rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground tracking-tight-ui">
                {isEditMode ? 'Edit Account' : 'Create New Account'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Company Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  onBlur={() => handleBlur('name')}
                  className={cn(
                    'w-full h-10 px-3 bg-background border rounded-lg text-sm text-foreground transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                    errors.name && touched.name ? 'border-destructive' : 'border-border'
                  )}
                  placeholder="Acme Corporation"
                />
                {errors.name && touched.name && (
                  <p className="mt-1 text-xs text-destructive">{errors.name}</p>
                )}
              </div>

              {/* Industry & Tier row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Industry <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={formData.industry}
                    onChange={(e) => handleChange('industry', e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    {industries.map(industry => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Tier <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={formData.tier}
                    onChange={(e) => handleChange('tier', e.target.value as Tier)}
                    className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    {tiers.map(tier => (
                      <option key={tier.value} value={tier.value}>{tier.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ARR */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Annual Recurring Revenue (ARR) <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <input
                    type="number"
                    value={formData.arr}
                    onChange={(e) => handleChange('arr', e.target.value)}
                    onBlur={() => handleBlur('arr')}
                    className={cn(
                      'w-full h-10 pl-7 pr-3 bg-background border rounded-lg text-sm text-foreground transition-all',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                      errors.arr && touched.arr ? 'border-destructive' : 'border-border'
                    )}
                    placeholder="100000"
                    min="1000"
                  />
                </div>
                {errors.arr && touched.arr && (
                  <p className="mt-1 text-xs text-destructive">{errors.arr}</p>
                )}
              </div>

              {/* CSM Owner */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  CSM Owner
                </label>
                <select
                  value={formData.csmOwner}
                  onChange={(e) => handleChange('csmOwner', e.target.value)}
                  className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>

              {/* Website */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  onBlur={() => handleBlur('website')}
                  className={cn(
                    'w-full h-10 px-3 bg-background border rounded-lg text-sm text-foreground transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                    errors.website && touched.website ? 'border-destructive' : 'border-border'
                  )}
                  placeholder="https://acme.com"
                />
                {errors.website && touched.website && (
                  <p className="mt-1 text-xs text-destructive">{errors.website}</p>
                )}
              </div>

              {/* Status (Edit mode only) */}
              {isEditMode && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value as AccountStatus)}
                    className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    {statuses.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Primary Contact (Create mode only) */}
              {!isEditMode && (
                <div className="pt-4 border-t border-border">
                  <h3 className="text-sm font-medium text-foreground mb-3">Primary Contact (Optional)</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={formData.primaryContactName}
                      onChange={(e) => handleChange('primaryContactName', e.target.value)}
                      className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="Contact name"
                    />
                    <input
                      type="email"
                      value={formData.primaryContactEmail}
                      onChange={(e) => handleChange('primaryContactEmail', e.target.value)}
                      onBlur={() => handleBlur('primaryContactEmail')}
                      className={cn(
                        'w-full h-10 px-3 bg-background border rounded-lg text-sm text-foreground transition-all',
                        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                        errors.primaryContactEmail && touched.primaryContactEmail ? 'border-destructive' : 'border-border'
                      )}
                      placeholder="contact@company.com"
                    />
                    {errors.primaryContactEmail && touched.primaryContactEmail && (
                      <p className="text-xs text-destructive">{errors.primaryContactEmail}</p>
                    )}
                  </div>
                </div>
              )}
            </form>

            {/* Footer */}
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
                    ? 'bg-primary hover:bg-primary/90 shadow-sm'
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
                    {isEditMode ? 'Save Changes' : 'Create Account'}
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
