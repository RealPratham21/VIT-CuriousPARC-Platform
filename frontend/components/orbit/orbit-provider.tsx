'use client'

import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from 'react'
import {
  type Account,
  type Contact,
  type TimelineEvent,
  type Opportunity,
  type Settings,
  type TeamMember,
  initialAccounts,
  initialContacts,
  initialActivities,
  initialOpportunities,
  initialSettings,
  initialTeamMembers,
  generateId,
  calculateHealthScore,
  calculateNRR,
  getSentimentFromHealth,
  checkChurnRisk,
} from '@/lib/mock-data'

// SessionStorage keys
const STORAGE_KEYS = {
  accounts: 'orbit_accounts',
  contacts: 'orbit_contacts',
  activities: 'orbit_activities',
  opportunities: 'orbit_opportunities',
  settings: 'orbit_settings',
  selectedAccountId: 'orbit_selected_account',
  activeView: 'orbit_active_view',
  sidebarCollapsed: 'orbit_sidebar_collapsed',
  filterChip: 'orbit_filter_chip',
} as const

// Helper to safely parse dates from JSON
function reviveDates(key: string, value: unknown): unknown {
  if (typeof value === 'string') {
    // Check if it looks like an ISO date string
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return new Date(value)
    }
  }
  return value
}

// Helper to validate account data
function validateAccounts(accounts: Account[]): Account[] {
  return accounts.map(account => ({
    ...account,
    arr: typeof account.arr === 'number' && !isNaN(account.arr) ? account.arr : 100000,
    baselineArr: typeof account.baselineArr === 'number' && !isNaN(account.baselineArr) ? account.baselineArr : account.arr || 100000,
    nrr: typeof account.nrr === 'number' && !isNaN(account.nrr) ? account.nrr : 100,
    healthScore: typeof account.healthScore === 'number' && !isNaN(account.healthScore) ? account.healthScore : 50,
    lastActivity: account.lastActivity instanceof Date ? account.lastActivity : new Date(),
    createdAt: account.createdAt instanceof Date ? account.createdAt : new Date(),
    updatedAt: account.updatedAt instanceof Date ? account.updatedAt : new Date(),
  }))
}

// Helper to load from sessionStorage
function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const stored = sessionStorage.getItem(key)
    if (stored) {
      const parsed = JSON.parse(stored, reviveDates) as T
      // Validate accounts specifically
      if (key === STORAGE_KEYS.accounts && Array.isArray(parsed)) {
        return validateAccounts(parsed as unknown as Account[]) as T
      }
      return parsed
    }
  } catch (e) {
    console.error(`Failed to load ${key} from sessionStorage:`, e)
    // Clear corrupted data
    sessionStorage.removeItem(key)
  }
  return fallback
}

// Helper to save to sessionStorage
function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error(`Failed to save ${key} to sessionStorage:`, e)
  }
}

interface PortfolioMetrics {
  totalArr: number
  averageNrr: number
  averageHealthScore: number
  accountCount: number
}

export type FilterChip = 'all' | 'at-risk' | 'enterprise' | 'healthy'

interface OrbitContextValue {
  // Data
  accounts: Account[]
  contacts: Contact[]
  activities: TimelineEvent[]
  opportunities: Opportunity[]
  settings: Settings
  teamMembers: TeamMember[]
  
  // Navigation state
  selectedAccountId: string | null
  activeView: 'dashboard' | 'accounts' | 'analytics' | 'settings'
  selectAccount: (id: string | null) => void
  setActiveView: (view: 'dashboard' | 'accounts' | 'analytics' | 'settings') => void
  
  // Sidebar state
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  filterChip: FilterChip
  setFilterChip: (filter: FilterChip) => void
  
  // Account actions
  addAccount: (account: Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'healthScore' | 'sentiment' | 'nrr'>) => Account
  updateAccount: (id: string, updates: Partial<Account>) => void
  deleteAccount: (id: string) => void
  archiveAccount: (id: string) => void
  restoreAccount: (id: string) => void
  
  // Contact actions
  addContact: (contact: Omit<Contact, 'id' | 'createdAt'>) => Contact
  updateContact: (id: string, updates: Partial<Contact>) => void
  deleteContact: (id: string) => void
  
  // Activity actions
  addActivity: (activity: Omit<TimelineEvent, 'id'>) => TimelineEvent
  updateActivity: (id: string, updates: Partial<TimelineEvent>) => void
  deleteActivity: (id: string) => void
  
  // Opportunity actions
  addOpportunity: (opportunity: Omit<Opportunity, 'id' | 'createdAt' | 'updatedAt'>) => Opportunity
  updateOpportunity: (id: string, updates: Partial<Opportunity>) => void
  deleteOpportunity: (id: string) => void
  closeOpportunityWon: (id: string) => void
  
  // Settings actions
  updateSettings: (updates: Partial<Settings>) => void
  
  // Team actions
  addTeamMember: (member: Omit<TeamMember, 'id'>) => TeamMember
  updateTeamMember: (id: string, updates: Partial<TeamMember>) => void
  deleteTeamMember: (id: string) => void
  
  // Health actions
  setHealthOverride: (accountId: string, value: number, reason: string, expiresAt: Date | null) => void
  clearHealthOverride: (accountId: string) => void
  recalculateHealth: (accountId: string) => void
  
  // Utility
  getAccountById: (id: string) => Account | undefined
  getContactsForAccount: (accountId: string) => Contact[]
  getActivitiesForAccount: (accountId: string) => TimelineEvent[]
  getOpportunitiesForAccount: (accountId: string) => Opportunity[]
  getPortfolioMetrics: () => PortfolioMetrics
  resetToDefaults: () => void
}

const OrbitContext = createContext<OrbitContextValue | null>(null)

export function useOrbit() {
  const context = useContext(OrbitContext)
  if (!context) {
    throw new Error('useOrbit must be used within an OrbitProvider')
  }
  return context
}

export function OrbitProvider({ children }: { children: ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts)
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [activities, setActivities] = useState<TimelineEvent[]>(initialActivities)
  const [opportunities, setOpportunities] = useState<Opportunity[]>(initialOpportunities)
  const [settings, setSettings] = useState<Settings>(initialSettings)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers)
  
  // Navigation state
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [activeView, setActiveViewState] = useState<'dashboard' | 'accounts' | 'analytics' | 'settings'>('dashboard')
  
  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false)
  const [filterChip, setFilterChipState] = useState<FilterChip>('all')
  
  // Hydrate from sessionStorage on mount
  useEffect(() => {
    setAccounts(loadFromStorage(STORAGE_KEYS.accounts, initialAccounts))
    setContacts(loadFromStorage(STORAGE_KEYS.contacts, initialContacts))
    setActivities(loadFromStorage(STORAGE_KEYS.activities, initialActivities))
    setOpportunities(loadFromStorage(STORAGE_KEYS.opportunities, initialOpportunities))
    setSettings(loadFromStorage(STORAGE_KEYS.settings, initialSettings))
    setSelectedAccountId(loadFromStorage(STORAGE_KEYS.selectedAccountId, null))
    setActiveViewState(loadFromStorage(STORAGE_KEYS.activeView, 'dashboard'))
    setSidebarCollapsedState(loadFromStorage(STORAGE_KEYS.sidebarCollapsed, false))
    setFilterChipState(loadFromStorage(STORAGE_KEYS.filterChip, 'all'))
    setIsHydrated(true)
  }, [])
  
  // Persist state changes to sessionStorage
  useEffect(() => {
    if (!isHydrated) return
    saveToStorage(STORAGE_KEYS.accounts, accounts)
  }, [accounts, isHydrated])
  
  useEffect(() => {
    if (!isHydrated) return
    saveToStorage(STORAGE_KEYS.contacts, contacts)
  }, [contacts, isHydrated])
  
  useEffect(() => {
    if (!isHydrated) return
    saveToStorage(STORAGE_KEYS.activities, activities)
  }, [activities, isHydrated])
  
  useEffect(() => {
    if (!isHydrated) return
    saveToStorage(STORAGE_KEYS.opportunities, opportunities)
  }, [opportunities, isHydrated])
  
  useEffect(() => {
    if (!isHydrated) return
    saveToStorage(STORAGE_KEYS.settings, settings)
  }, [settings, isHydrated])
  
  useEffect(() => {
    if (!isHydrated) return
    saveToStorage(STORAGE_KEYS.selectedAccountId, selectedAccountId)
  }, [selectedAccountId, isHydrated])
  
  useEffect(() => {
    if (!isHydrated) return
    saveToStorage(STORAGE_KEYS.activeView, activeView)
  }, [activeView, isHydrated])
  
  useEffect(() => {
    if (!isHydrated) return
    saveToStorage(STORAGE_KEYS.sidebarCollapsed, sidebarCollapsed)
  }, [sidebarCollapsed, isHydrated])
  
  useEffect(() => {
    if (!isHydrated) return
    saveToStorage(STORAGE_KEYS.filterChip, filterChip)
  }, [filterChip, isHydrated])
  
  const selectAccount = useCallback((id: string | null) => {
    setSelectedAccountId(id)
  }, [])
  
  const setActiveView = useCallback((view: 'dashboard' | 'accounts' | 'analytics' | 'settings') => {
    setActiveViewState(view)
    if (view !== 'accounts') {
      setSelectedAccountId(null)
    }
  }, [])
  
  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setSidebarCollapsedState(collapsed)
  }, [])
  
  const setFilterChip = useCallback((filter: FilterChip) => {
    setFilterChipState(filter)
  }, [])

  // Helper to recalculate account health and related fields
  const recalculateAccountHealth = useCallback((accountId: string, currentActivities: TimelineEvent[]) => {
    setAccounts(prev => prev.map(account => {
      if (account.id !== accountId) return account
      if (account.healthOverride) return account // Skip if override is set
      
      const newHealthScore = calculateHealthScore(
        accountId,
        currentActivities,
        settings.healthWeights,
        account.tier
      )
      const newSentiment = getSentimentFromHealth(newHealthScore)
      const newChurnRisk = checkChurnRisk({ ...account, healthScore: newHealthScore }, currentActivities)
      
      return {
        ...account,
        healthScore: newHealthScore,
        sentiment: newSentiment,
        churnRisk: newChurnRisk,
        updatedAt: new Date(),
      }
    }))
  }, [settings.healthWeights])

  // Account actions
  const addAccount = useCallback((accountData: Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'healthScore' | 'sentiment' | 'nrr'>) => {
    const now = new Date()
    const id = generateId('acc')
    
    const newAccount: Account = {
      ...accountData,
      id,
      healthScore: 50, // Default starting health
      sentiment: 'neutral',
      nrr: 100,
      baselineArr: accountData.arr,
      createdAt: now,
      updatedAt: now,
    }
    
    setAccounts(prev => [...prev, newAccount])
    
    // Add system activity for account creation
    const createActivity: TimelineEvent = {
      id: generateId('act'),
      accountId: id,
      type: 'note',
      title: 'Account Created',
      description: `${newAccount.name} was added to the portfolio`,
      timestamp: now,
      isSystemGenerated: true,
    }
    setActivities(prev => [...prev, createActivity])
    
    return newAccount
  }, [])

  const updateAccount = useCallback((id: string, updates: Partial<Account>) => {
    setAccounts(prev => prev.map(account => {
      if (account.id !== id) return account
      
      const updated = {
        ...account,
        ...updates,
        updatedAt: new Date(),
      }
      
      // Recalculate NRR if ARR changed
      if (updates.arr !== undefined) {
        updated.nrr = calculateNRR(updates.arr, account.baselineArr)
      }
      
      return updated
    }))
    
    // Log ARR changes as activities
    if (updates.arr !== undefined) {
      const account = accounts.find(a => a.id === id)
      if (account && account.arr !== updates.arr) {
        const percentChange = ((updates.arr - account.arr) / account.arr * 100).toFixed(1)
        const changeDirection = updates.arr > account.arr ? '+' : ''
        
        const arrActivity: TimelineEvent = {
          id: generateId('act'),
          accountId: id,
          type: 'note',
          title: 'ARR Updated',
          description: `ARR changed from $${account.arr.toLocaleString()} to $${updates.arr.toLocaleString()} (${changeDirection}${percentChange}%)`,
          timestamp: new Date(),
          isSystemGenerated: true,
        }
        setActivities(prev => [...prev, arrActivity])
      }
    }
    
    // Log status changes
    if (updates.status !== undefined) {
      const account = accounts.find(a => a.id === id)
      if (account && account.status !== updates.status) {
        const statusActivity: TimelineEvent = {
          id: generateId('act'),
          accountId: id,
          type: 'note',
          title: 'Status Changed',
          description: `Account status changed to ${updates.status}`,
          timestamp: new Date(),
          isSystemGenerated: true,
        }
        setActivities(prev => [...prev, statusActivity])
      }
    }
  }, [accounts])

  const deleteAccount = useCallback((id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id))
    setContacts(prev => prev.filter(c => c.accountId !== id))
    setActivities(prev => prev.filter(a => a.accountId !== id))
    setOpportunities(prev => prev.filter(o => o.accountId !== id))
  }, [])

  const archiveAccount = useCallback((id: string) => {
    setAccounts(prev => prev.map(account =>
      account.id === id ? { ...account, status: 'archived' as const, updatedAt: new Date() } : account
    ))
  }, [])

  const restoreAccount = useCallback((id: string) => {
    setAccounts(prev => prev.map(account =>
      account.id === id ? { ...account, status: 'active' as const, updatedAt: new Date() } : account
    ))
  }, [])

  // Contact actions
  const addContact = useCallback((contactData: Omit<Contact, 'id' | 'createdAt'>) => {
    const id = generateId('cnt')
    const newContact: Contact = {
      ...contactData,
      id,
      createdAt: new Date(),
    }
    
    // If this is a primary contact, unset other primary contacts for this account
    if (newContact.isPrimary) {
      setContacts(prev => prev.map(c =>
        c.accountId === newContact.accountId && c.isPrimary
          ? { ...c, isPrimary: false }
          : c
      ))
    }
    
    setContacts(prev => [...prev, newContact])
    return newContact
  }, [])

  const updateContact = useCallback((id: string, updates: Partial<Contact>) => {
    setContacts(prev => {
      const contact = prev.find(c => c.id === id)
      if (!contact) return prev
      
      // If setting as primary, unset other primary contacts
      if (updates.isPrimary) {
        return prev.map(c => {
          if (c.id === id) return { ...c, ...updates }
          if (c.accountId === contact.accountId && c.isPrimary) return { ...c, isPrimary: false }
          return c
        })
      }
      
      return prev.map(c => c.id === id ? { ...c, ...updates } : c)
    })
  }, [])

  const deleteContact = useCallback((id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id))
  }, [])

  // Activity actions
  const addActivity = useCallback((activityData: Omit<TimelineEvent, 'id'>) => {
    const id = generateId('act')
    const newActivity: TimelineEvent = {
      ...activityData,
      id,
    }
    
    setActivities(prev => {
      const updated = [...prev, newActivity]
      // Recalculate health after adding activity
      recalculateAccountHealth(activityData.accountId, updated)
      return updated
    })
    
    // Update account's lastActivity
    setAccounts(prev => prev.map(account =>
      account.id === activityData.accountId
        ? { ...account, lastActivity: activityData.timestamp, updatedAt: new Date() }
        : account
    ))
    
    return newActivity
  }, [recalculateAccountHealth])

  const updateActivity = useCallback((id: string, updates: Partial<TimelineEvent>) => {
    setActivities(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, ...updates } : a)
      const activity = updated.find(a => a.id === id)
      if (activity) {
        recalculateAccountHealth(activity.accountId, updated)
      }
      return updated
    })
  }, [recalculateAccountHealth])

  const deleteActivity = useCallback((id: string) => {
    const activity = activities.find(a => a.id === id)
    if (!activity) return
    
    setActivities(prev => {
      const updated = prev.filter(a => a.id !== id)
      recalculateAccountHealth(activity.accountId, updated)
      return updated
    })
    
    // Update lastActivity to the next most recent
    const remainingActivities = activities.filter(a => a.accountId === activity.accountId && a.id !== id)
    if (remainingActivities.length > 0) {
      const mostRecent = remainingActivities.reduce((latest, a) =>
        a.timestamp > latest.timestamp ? a : latest
      )
      setAccounts(prev => prev.map(account =>
        account.id === activity.accountId
          ? { ...account, lastActivity: mostRecent.timestamp }
          : account
      ))
    }
  }, [activities, recalculateAccountHealth])

  // Opportunity actions
  const addOpportunity = useCallback((oppData: Omit<Opportunity, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date()
    const id = generateId('opp')
    const newOpp: Opportunity = {
      ...oppData,
      id,
      createdAt: now,
      updatedAt: now,
    }
    
    setOpportunities(prev => [...prev, newOpp])
    return newOpp
  }, [])

  const updateOpportunity = useCallback((id: string, updates: Partial<Opportunity>) => {
    setOpportunities(prev => prev.map(opp =>
      opp.id === id ? { ...opp, ...updates, updatedAt: new Date() } : opp
    ))
  }, [])

  const deleteOpportunity = useCallback((id: string) => {
    setOpportunities(prev => prev.filter(o => o.id !== id))
  }, [])

  const closeOpportunityWon = useCallback((id: string) => {
    const opp = opportunities.find(o => o.id === id)
    if (!opp) return
    
    // Update opportunity status
    setOpportunities(prev => prev.map(o =>
      o.id === id ? { ...o, status: 'closed-won' as const, probability: 100, updatedAt: new Date() } : o
    ))
    
    // Add ARR to account
    setAccounts(prev => prev.map(account => {
      if (account.id !== opp.accountId) return account
      const newArr = account.arr + opp.potentialArr
      return {
        ...account,
        arr: newArr,
        nrr: calculateNRR(newArr, account.baselineArr),
        updatedAt: new Date(),
      }
    }))
    
    // Log activity
    const wonActivity: TimelineEvent = {
      id: generateId('act'),
      accountId: opp.accountId,
      type: 'note',
      title: 'Opportunity Won',
      description: `${opp.product} closed-won for $${opp.potentialArr.toLocaleString()}`,
      timestamp: new Date(),
      isSystemGenerated: true,
      healthImpact: 10,
    }
    setActivities(prev => [...prev, wonActivity])
  }, [opportunities])

  // Settings actions
  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...updates }))
  }, [])

  // Team actions
  const addTeamMember = useCallback((memberData: Omit<TeamMember, 'id'>) => {
    const id = generateId('tm')
    const newMember: TeamMember = { ...memberData, id }
    setTeamMembers(prev => [...prev, newMember])
    return newMember
  }, [])

  const updateTeamMember = useCallback((id: string, updates: Partial<TeamMember>) => {
    setTeamMembers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m))
  }, [])

  const deleteTeamMember = useCallback((id: string) => {
    setTeamMembers(prev => prev.filter(m => m.id !== id))
  }, [])

  // Health override actions
  const setHealthOverride = useCallback((accountId: string, value: number, reason: string, expiresAt: Date | null) => {
    setAccounts(prev => prev.map(account =>
      account.id === accountId
        ? {
            ...account,
            healthScore: value,
            healthOverride: {
              value,
              reason,
              expiresAt,
              setBy: 'Current User', // In a real app, this would be the logged-in user
              setAt: new Date(),
            },
            sentiment: getSentimentFromHealth(value),
            updatedAt: new Date(),
          }
        : account
    ))
  }, [])

  const clearHealthOverride = useCallback((accountId: string) => {
    setAccounts(prev => prev.map(account => {
      if (account.id !== accountId) return account
      const { healthOverride: _, ...rest } = account
      return rest as Account
    }))
    // Recalculate health after clearing override
    recalculateAccountHealth(accountId, activities)
  }, [activities, recalculateAccountHealth])

  const recalculateHealth = useCallback((accountId: string) => {
    recalculateAccountHealth(accountId, activities)
  }, [activities, recalculateAccountHealth])

  // Utility functions
  const getAccountById = useCallback((id: string) => {
    return accounts.find(a => a.id === id)
  }, [accounts])

  const getContactsForAccount = useCallback((accountId: string) => {
    return contacts.filter(c => c.accountId === accountId)
  }, [contacts])

  const getActivitiesForAccount = useCallback((accountId: string) => {
    return activities
      .filter(a => a.accountId === accountId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }, [activities])

  const getOpportunitiesForAccount = useCallback((accountId: string) => {
    return opportunities.filter(o => o.accountId === accountId)
  }, [opportunities])

  const resetToDefaults = useCallback(() => {
    // Clear sessionStorage
    if (typeof window !== 'undefined') {
      Object.values(STORAGE_KEYS).forEach(key => {
        sessionStorage.removeItem(key)
      })
    }
    // Reset state to initial values
    setAccounts(initialAccounts)
    setContacts(initialContacts)
    setActivities(initialActivities)
    setOpportunities(initialOpportunities)
    setSettings(initialSettings)
    setTeamMembers(initialTeamMembers)
    setSelectedAccountId(null)
    setActiveViewState('dashboard')
    setSidebarCollapsedState(false)
    setFilterChipState('all')
  }, [])
  
  const getPortfolioMetrics = useCallback((): PortfolioMetrics => {
    const activeAccounts = accounts.filter(a => a.status !== 'archived')
    const totalArr = activeAccounts.reduce((sum, a) => sum + a.arr, 0)
    const averageNrr = activeAccounts.length > 0
      ? activeAccounts.reduce((sum, a) => sum + a.nrr, 0) / activeAccounts.length
      : 100
    const averageHealthScore = activeAccounts.length > 0
      ? activeAccounts.reduce((sum, a) => sum + a.healthScore, 0) / activeAccounts.length
      : 0
    
    return {
      totalArr,
      averageNrr: Math.round(averageNrr),
      averageHealthScore: Math.round(averageHealthScore),
      accountCount: activeAccounts.length,
    }
  }, [accounts])

  const value = useMemo<OrbitContextValue>(() => ({
    accounts,
    contacts,
    activities,
    opportunities,
    settings,
    teamMembers,
    selectedAccountId,
    activeView,
    selectAccount,
    setActiveView,
    sidebarCollapsed,
    setSidebarCollapsed,
    filterChip,
    setFilterChip,
    addAccount,
    updateAccount,
    deleteAccount,
    archiveAccount,
    restoreAccount,
    addContact,
    updateContact,
    deleteContact,
    addActivity,
    updateActivity,
    deleteActivity,
    addOpportunity,
    updateOpportunity,
    deleteOpportunity,
    closeOpportunityWon,
    updateSettings,
    addTeamMember,
    updateTeamMember,
    deleteTeamMember,
    setHealthOverride,
    clearHealthOverride,
    recalculateHealth,
    getAccountById,
    getContactsForAccount,
    getActivitiesForAccount,
    getOpportunitiesForAccount,
    getPortfolioMetrics,
    resetToDefaults,
  }), [
    accounts, contacts, activities, opportunities, settings, teamMembers,
    selectedAccountId, activeView, selectAccount, setActiveView,
    sidebarCollapsed, setSidebarCollapsed, filterChip, setFilterChip,
    addAccount, updateAccount, deleteAccount, archiveAccount, restoreAccount,
    addContact, updateContact, deleteContact,
    addActivity, updateActivity, deleteActivity,
    addOpportunity, updateOpportunity, deleteOpportunity, closeOpportunityWon,
    updateSettings,
    addTeamMember, updateTeamMember, deleteTeamMember,
    setHealthOverride, clearHealthOverride, recalculateHealth,
    getAccountById, getContactsForAccount, getActivitiesForAccount, getOpportunitiesForAccount,
    getPortfolioMetrics, resetToDefaults,
  ])

  return (
    <OrbitContext.Provider value={value}>
      {children}
    </OrbitContext.Provider>
  )
}
