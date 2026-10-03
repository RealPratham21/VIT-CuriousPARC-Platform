'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, Building2, DollarSign, Users, Calendar, 
  MoreVertical, Pencil, Archive, Trash2, RefreshCw, Star,
  Plus, Mail, Phone
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency, formatRelativeTime, getAvatarColor, getInitials, type Account } from '@/lib/mock-data'
import { useOrbit } from './orbit-provider'
import { useToastActions } from './toast-provider'
import { SentimentOrb } from './sentiment-orb'
import { TimelineOfTruth } from './timeline-of-truth'
import { ExpansionTable } from './expansion-table'
import { EditableMetricCard } from './editable-metric-card'
import { ContactCard } from './contact-card'
import { AccountDeepDiveSkeleton } from './skeletons'
import { ConfirmModal } from './modals/confirm-modal'
import { ActivityModal } from './modals/activity-modal'
import { ContactModal } from './modals/contact-modal'
import { OpportunityModal } from './modals/opportunity-modal'
import type { Contact } from '@/lib/mock-data'

interface AccountDeepDiveProps {
  account: Account
  onBack: () => void
  onEdit: () => void
}

export function AccountDeepDive({ account, onBack, onEdit }: AccountDeepDiveProps) {
  const { 
    deleteAccount, 
    archiveAccount, 
    restoreAccount,
    updateAccount,
    deleteContact,
    getContactsForAccount,
    getActivitiesForAccount,
    getOpportunitiesForAccount,
  } = useOrbit()
  const toast = useToastActions()
  
  const [isLoading, setIsLoading] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null)
  const [showOpportunityModal, setShowOpportunityModal] = useState(false)

  // Simulate loading state when switching accounts
  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => setIsLoading(false), 400)
    return () => clearTimeout(timer)
  }, [account.id])

  const contacts = getContactsForAccount(account.id)
  const activities = getActivitiesForAccount(account.id)
  const opportunities = getOpportunitiesForAccount(account.id)
  
  // Ensure account values are valid numbers
  const safeArr = typeof account.arr === 'number' && !isNaN(account.arr) ? account.arr : 100000
  const safeNrr = typeof account.nrr === 'number' && !isNaN(account.nrr) ? account.nrr : 100
  const safeHealthScore = typeof account.healthScore === 'number' && !isNaN(account.healthScore) ? account.healthScore : 50

  const handleDelete = () => {
    deleteAccount(account.id)
    toast.success(`${account.name} deleted`)
    onBack()
  }

  const handleArchive = () => {
    archiveAccount(account.id)
    toast.info(`${account.name} archived`)
    setShowMenu(false)
  }

  const handleRestore = () => {
    restoreAccount(account.id)
    toast.success(`${account.name} restored`)
    setShowMenu(false)
  }

  const handleArrUpdate = (newArr: number) => {
    updateAccount(account.id, { arr: newArr * 1000 }) // Convert from K
    toast.success('ARR updated')
  }

  const handleDeleteContact = () => {
    if (!deletingContact) return
    deleteContact(deletingContact.id)
    toast.success('Contact deleted')
    setDeletingContact(null)
  }

  const isArchived = account.status === 'archived'

  // Show skeleton while loading
  if (isLoading) {
    return <AccountDeepDiveSkeleton />
  }

  return (
    <motion.div 
      className="p-6 space-y-6 overflow-y-auto h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <motion.button
            onClick={onBack}
            className="w-9 h-9 rounded-lg bg-muted border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
            aria-label="Back to dashboard"
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-4 h-4" />
          </motion.button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-foreground tracking-tight-ui">
                {account.name}
              </h1>
              <span
                className={cn(
                  'px-2 py-0.5 rounded text-xs font-medium transition-all',
                  account.tier === 'enterprise' && 'bg-primary/10 text-primary',
                  account.tier === 'mid-market' && 'bg-emerald-100 text-emerald-700',
                  account.tier === 'startup' && 'bg-amber-100 text-amber-700'
                )}
              >
                {account.tier.charAt(0).toUpperCase() + account.tier.slice(1)}
              </span>
              {isArchived && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                  Archived
                </span>
              )}
              {account.churnRisk === 'high' && !isArchived && (
                <span className="px-2 py-0.5 rounded text-xs font-medium badge-critical pulse-risk">
                  Churn Risk
                </span>
              )}
              {account.healthOverride && (
                <span className="px-2 py-0.5 rounded text-xs font-medium badge-info">
                  Manual Override
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5" />
              {account.industry}
              <span className="text-border">•</span>
              Last active {formatRelativeTime(account.lastActivity)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <motion.button
            onClick={onEdit}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground bg-muted border border-border/50 rounded-lg hover:bg-secondary transition-colors"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            <Pencil className="w-4 h-4" />
            Edit
          </motion.button>
          
          {/* More menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-9 h-9 rounded-lg bg-muted border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="More actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            
            <AnimatePresence>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border/50 rounded-lg shadow-lg glass-panel z-20 py-1"
                  >
                    {isArchived ? (
                      <button
                        onClick={handleRestore}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Restore Account
                      </button>
                    ) : (
                      <button
                        onClick={handleArchive}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        <Archive className="w-4 h-4" />
                        Archive Account
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowMenu(false)
                        setShowDeleteConfirm(true)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Account
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Key metrics row - now with inline editing */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <EditableMetricCard
          label="ARR"
          value={safeArr / 1000}
          prefix="$"
          suffix="K"
          onSave={handleArrUpdate}
          icon={<DollarSign className="w-4 h-4 text-primary" />}
        />

        <EditableMetricCard
          label="NRR"
          value={safeNrr}
          suffix="%"
          onSave={(val) => updateAccount(account.id, { nrr: val })}
          colorClass={safeNrr >= 100 ? 'text-emerald-600' : 'text-amber-600'}
          icon={
            <svg
              className={cn('w-4 h-4', safeNrr >= 100 ? 'text-emerald-500' : 'text-amber-500')}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />

        <EditableMetricCard
          label="Contacts"
          value={contacts.length}
          onSave={() => {}}
          readonly
          icon={<Users className="w-4 h-4 text-muted-foreground" />}
        />

        <EditableMetricCard
          label="Events"
          value={activities.length}
          onSave={() => {}}
          readonly
          icon={<Calendar className="w-4 h-4 text-muted-foreground" />}
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sentiment Orb */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <SentimentOrb sentiment={account.sentiment} healthScore={safeHealthScore} />
        </motion.div>

        {/* Timeline - takes 2 columns */}
        <motion.div 
          className="lg:col-span-2"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="card-surface p-5 flex flex-col" style={{ maxHeight: '400px' }}>
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h3 className="text-sm font-semibold text-foreground tracking-tight-ui">
                Timeline
              </h3>
              <button
                onClick={() => setShowActivityModal(true)}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Log Activity
              </button>
            </div>
            <div className="overflow-y-auto flex-1 -mr-2 pr-2">
              <TimelineOfTruth events={activities} accountId={account.id} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Expansion opportunities */}
      <motion.div 
        className="card-surface p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground tracking-tight-ui">
            Expansion Opportunities
          </h3>
          <button
            onClick={() => setShowOpportunityModal(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Opportunity
          </button>
        </div>
        <ExpansionTable opportunities={opportunities} accountId={account.id} />
      </motion.div>

      {/* Contacts - now using ContactCard */}
      <motion.div 
        className="card-surface p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground tracking-tight-ui">
            Key Contacts
          </h3>
          <button
            onClick={() => {
              setEditingContact(null)
              setShowContactModal(true)
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Contact
          </button>
        </div>
        
        {contacts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {contacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onEdit={() => {
                  setEditingContact(contact)
                  setShowContactModal(true)
                }}
                onDelete={() => setDeletingContact(contact)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">No contacts added yet</p>
            <button
              onClick={() => {
                setEditingContact(null)
                setShowContactModal(true)
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Contact
            </button>
          </div>
        )}
      </motion.div>

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Account?"
        message={`This will permanently delete ${account.name} and all associated data (${activities.length} activities, ${contacts.length} contacts, ${opportunities.length} opportunities). This cannot be undone.`}
        confirmText="Delete Account"
        variant="danger"
      />

      {/* Delete contact confirmation */}
      <ConfirmModal
        isOpen={!!deletingContact}
        onClose={() => setDeletingContact(null)}
        onConfirm={handleDeleteContact}
        title="Delete Contact?"
        message={`Are you sure you want to delete ${deletingContact?.name}? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Activity Modal */}
      <ActivityModal
        isOpen={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        accountId={account.id}
      />

      {/* Contact Modal */}
      <ContactModal
        isOpen={showContactModal}
        onClose={() => {
          setShowContactModal(false)
          setEditingContact(null)
        }}
        accountId={account.id}
        contact={editingContact}
      />

      {/* Opportunity Modal */}
      <OpportunityModal
        isOpen={showOpportunityModal}
        onClose={() => setShowOpportunityModal(false)}
        accountId={account.id}
      />
    </motion.div>
  )
}
