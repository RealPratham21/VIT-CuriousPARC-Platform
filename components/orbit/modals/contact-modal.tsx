'use client'

import React from "react"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOrbit } from '../orbit-provider'
import { useToastActions } from '../toast-provider'
import { type Contact, isValidEmail, isValidUrl } from '@/lib/mock-data'

interface ContactModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  contact?: Contact // If provided, it's edit mode
}

interface FormData {
  name: string
  role: string
  email: string
  phone: string
  linkedIn: string
  isPrimary: boolean
  isChampion: boolean
}

interface FormErrors {
  name?: string
  role?: string
  email?: string
  linkedIn?: string
}

export function ContactModal({ isOpen, onClose, accountId, contact }: ContactModalProps) {
  const { addContact, updateContact } = useOrbit()
  const toast = useToastActions()
  const isEditMode = !!contact

  const [formData, setFormData] = useState<FormData>({
    name: '',
    role: '',
    email: '',
    phone: '',
    linkedIn: '',
    isPrimary: false,
    isChampion: false,
  })
  
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (contact) {
        setFormData({
          name: contact.name,
          role: contact.role,
          email: contact.email,
          phone: contact.phone || '',
          linkedIn: contact.linkedIn || '',
          isPrimary: contact.isPrimary,
          isChampion: contact.isChampion,
        })
      } else {
        setFormData({
          name: '',
          role: '',
          email: '',
          phone: '',
          linkedIn: '',
          isPrimary: false,
          isChampion: false,
        })
      }
      setErrors({})
      setTouched({})
    }
  }, [isOpen, contact])

  const validateField = (field: keyof FormData, value: string): string | undefined => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Name is required'
        break
      case 'role':
        if (!value.trim()) return 'Role is required'
        break
      case 'email':
        if (!value.trim()) return 'Email is required'
        if (!isValidEmail(value)) return 'Please enter a valid email'
        break
      case 'linkedIn':
        if (value && !isValidUrl(value)) return 'Please enter a valid URL'
        break
    }
    return undefined
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    newErrors.name = validateField('name', formData.name)
    newErrors.role = validateField('role', formData.role)
    newErrors.email = validateField('email', formData.email)
    newErrors.linkedIn = validateField('linkedIn', formData.linkedIn)
    setErrors(newErrors)
    return !Object.values(newErrors).some(Boolean)
  }

  const handleBlur = (field: keyof FormData) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    const error = validateField(field, formData[field] as string)
    setErrors(prev => ({ ...prev, [field]: error }))
  }

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (touched[field] && typeof value === 'string') {
      const error = validateField(field, value)
      setErrors(prev => ({ ...prev, [field]: error }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 200))
    
    try {
      if (isEditMode && contact) {
        updateContact(contact.id, {
          name: formData.name,
          role: formData.role,
          email: formData.email,
          phone: formData.phone || undefined,
          linkedIn: formData.linkedIn || undefined,
          isPrimary: formData.isPrimary,
          isChampion: formData.isChampion,
        })
        toast.success('Contact updated')
      } else {
        addContact({
          accountId,
          name: formData.name,
          role: formData.role,
          email: formData.email,
          phone: formData.phone || undefined,
          linkedIn: formData.linkedIn || undefined,
          isPrimary: formData.isPrimary,
          isChampion: formData.isChampion,
        })
        toast.success('Contact added')
      }
      onClose()
    } catch {
      toast.error('Failed to save contact')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = formData.name.trim() && 
    formData.role.trim() && 
    formData.email.trim() && 
    isValidEmail(formData.email) &&
    (!formData.linkedIn || isValidUrl(formData.linkedIn))

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
                {isEditMode ? 'Edit Contact' : 'Add Contact'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Full Name <span className="text-destructive">*</span>
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
                  placeholder="Sarah Chen"
                />
                {errors.name && touched.name && (
                  <p className="mt-1 text-xs text-destructive">{errors.name}</p>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Role/Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => handleChange('role', e.target.value)}
                  onBlur={() => handleBlur('role')}
                  className={cn(
                    'w-full h-10 px-3 bg-background border rounded-lg text-sm text-foreground transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                    errors.role && touched.role ? 'border-destructive' : 'border-border'
                  )}
                  placeholder="VP of Engineering"
                />
                {errors.role && touched.role && (
                  <p className="mt-1 text-xs text-destructive">{errors.role}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Email <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  className={cn(
                    'w-full h-10 px-3 bg-background border rounded-lg text-sm text-foreground transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                    errors.email && touched.email ? 'border-destructive' : 'border-border'
                  )}
                  placeholder="sarah@company.com"
                />
                {errors.email && touched.email && (
                  <p className="mt-1 text-xs text-destructive">{errors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              {/* LinkedIn */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  LinkedIn URL
                </label>
                <input
                  type="url"
                  value={formData.linkedIn}
                  onChange={(e) => handleChange('linkedIn', e.target.value)}
                  onBlur={() => handleBlur('linkedIn')}
                  className={cn(
                    'w-full h-10 px-3 bg-background border rounded-lg text-sm text-foreground transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                    errors.linkedIn && touched.linkedIn ? 'border-destructive' : 'border-border'
                  )}
                  placeholder="https://linkedin.com/in/sarahchen"
                />
                {errors.linkedIn && touched.linkedIn && (
                  <p className="mt-1 text-xs text-destructive">{errors.linkedIn}</p>
                )}
              </div>

              {/* Checkboxes */}
              <div className="flex flex-col gap-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPrimary}
                    onChange={(e) => handleChange('isPrimary', e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                  />
                  <span className="text-sm text-foreground">Primary Contact</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isChampion}
                    onChange={(e) => handleChange('isChampion', e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                  />
                  <div>
                    <span className="text-sm text-foreground">Champion</span>
                    <p className="text-xs text-muted-foreground">Advocates for your product internally</p>
                  </div>
                </label>
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
                    {isEditMode ? 'Update' : 'Add Contact'}
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
