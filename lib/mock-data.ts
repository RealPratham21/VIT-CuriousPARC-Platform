// ORBIT Mock Data and Types

export type Sentiment = 'positive' | 'neutral' | 'negative' | 'critical'
export type HealthStatus = 'healthy' | 'at-risk' | 'critical' | 'neutral'
export type EventType = 'email' | 'slack' | 'login' | 'call' | 'meeting' | 'support' | 'note' | 'other'
export type OpportunityStatus = 'identified' | 'qualifying' | 'proposed' | 'negotiating' | 'closed-won' | 'closed-lost'
export type AccountStatus = 'active' | 'at-risk' | 'churned' | 'archived'
export type Tier = 'enterprise' | 'mid-market' | 'startup'
export type Industry = 'Technology' | 'Healthcare' | 'Finance' | 'Retail' | 'Manufacturing' | 'Media' | 'Research' | 'Logistics' | 'Marketing' | 'SaaS' | 'Other'

export interface Contact {
  id: string
  accountId: string
  name: string
  role: string
  email: string
  phone?: string
  linkedIn?: string
  isPrimary: boolean
  isChampion: boolean
  lastContacted?: Date
  createdAt: Date
}

export interface TimelineEvent {
  id: string
  accountId: string
  type: EventType
  title: string
  description: string
  timestamp: Date
  tags?: string[]
  healthImpact?: number // -10 to +10
  contactId?: string
  isSystemGenerated?: boolean
}

export interface Opportunity {
  id: string
  accountId: string
  product: string
  potentialArr: number
  probability: number
  status: OpportunityStatus
  expectedCloseDate?: Date
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface HealthOverride {
  value: number
  reason: string
  expiresAt: Date | null
  setBy: string
  setAt: Date
}

export interface Account {
  id: string
  name: string
  arr: number
  baselineArr: number // ARR at creation for NRR calculation
  healthScore: number
  healthOverride?: HealthOverride
  lastActivity: Date
  sentiment: Sentiment
  nrr: number
  industry: Industry
  tier: Tier
  status: AccountStatus
  website?: string
  csmOwner?: string
  churnRisk?: 'high' | 'medium' | 'low'
  createdAt: Date
  updatedAt: Date
}

export interface TeamMember {
  id: string
  name: string
  email: string
  role: 'csm' | 'manager' | 'admin'
  avatar?: string
  status: 'active' | 'inactive'
}

export interface Settings {
  theme: 'light' | 'dark'
  defaultView: 'dashboard' | 'accounts' | 'analytics'
  healthWeights: {
    recency: number
    engagement: number
    support: number
  }
  healthThresholds: {
    healthy: number
    atRisk: number
  }
  notifications: {
    emailHealthAlerts: boolean
    weeklyDigest: boolean
    desktopNotifications: boolean
  }
}

export interface ChurnDataPoint {
  month: string
  predicted: number
  actual: number | null
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  duration?: number
}

// Helper to generate IDs
export const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Helper to generate dates
const daysAgo = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

const hoursAgo = (hours: number) => {
  const date = new Date()
  date.setHours(date.getHours() - hours)
  return date
}

// Mock team members
export const initialTeamMembers: TeamMember[] = [
  { id: 'tm-001', name: 'Alex Morgan', email: 'alex@company.com', role: 'manager', status: 'active' },
  { id: 'tm-002', name: 'Jordan Lee', email: 'jordan@company.com', role: 'csm', status: 'active' },
  { id: 'tm-003', name: 'Sam Taylor', email: 'sam@company.com', role: 'csm', status: 'active' },
  { id: 'tm-004', name: 'Casey Kim', email: 'casey@company.com', role: 'csm', status: 'active' },
]

// Initial settings
export const initialSettings: Settings = {
  theme: 'light',
  defaultView: 'dashboard',
  healthWeights: {
    recency: 30,
    engagement: 40,
    support: 30,
  },
  healthThresholds: {
    healthy: 70,
    atRisk: 50,
  },
  notifications: {
    emailHealthAlerts: true,
    weeklyDigest: true,
    desktopNotifications: false,
  },
}

// Mock accounts data
export const initialAccounts: Account[] = [
  {
    id: 'acc-001',
    name: 'Acme Corporation',
    arr: 450000,
    baselineArr: 400000,
    healthScore: 92,
    lastActivity: hoursAgo(2),
    sentiment: 'positive',
    nrr: 118,
    industry: 'Technology',
    tier: 'enterprise',
    status: 'active',
    website: 'https://acme.com',
    csmOwner: 'tm-002',
    createdAt: daysAgo(365),
    updatedAt: hoursAgo(2),
  },
  {
    id: 'acc-002',
    name: 'TechFlow Systems',
    arr: 280000,
    baselineArr: 260000,
    healthScore: 78,
    lastActivity: daysAgo(1),
    sentiment: 'neutral',
    nrr: 105,
    industry: 'Finance',
    tier: 'enterprise',
    status: 'active',
    website: 'https://techflow.io',
    csmOwner: 'tm-003',
    createdAt: daysAgo(280),
    updatedAt: daysAgo(1),
  },
  {
    id: 'acc-003',
    name: 'CloudScale Inc',
    arr: 520000,
    baselineArr: 560000,
    healthScore: 45,
    lastActivity: daysAgo(5),
    sentiment: 'negative',
    nrr: 92,
    industry: 'SaaS',
    tier: 'enterprise',
    status: 'at-risk',
    website: 'https://cloudscale.com',
    csmOwner: 'tm-002',
    churnRisk: 'high',
    createdAt: daysAgo(450),
    updatedAt: daysAgo(5),
  },
  {
    id: 'acc-004',
    name: 'DataPrime Analytics',
    arr: 180000,
    baselineArr: 145000,
    healthScore: 88,
    lastActivity: hoursAgo(6),
    sentiment: 'positive',
    nrr: 125,
    industry: 'Healthcare',
    tier: 'mid-market',
    status: 'active',
    website: 'https://dataprime.health',
    csmOwner: 'tm-004',
    createdAt: daysAgo(180),
    updatedAt: hoursAgo(6),
  },
  {
    id: 'acc-005',
    name: 'Nexus Retail',
    arr: 95000,
    baselineArr: 110000,
    healthScore: 28,
    lastActivity: daysAgo(14),
    sentiment: 'critical',
    nrr: 85,
    industry: 'Retail',
    tier: 'mid-market',
    status: 'at-risk',
    website: 'https://nexusretail.com',
    csmOwner: 'tm-003',
    churnRisk: 'high',
    createdAt: daysAgo(320),
    updatedAt: daysAgo(14),
  },
  {
    id: 'acc-006',
    name: 'Quantum Labs',
    arr: 340000,
    baselineArr: 300000,
    healthScore: 85,
    lastActivity: hoursAgo(12),
    sentiment: 'positive',
    nrr: 112,
    industry: 'Research',
    tier: 'enterprise',
    status: 'active',
    website: 'https://quantumlabs.io',
    csmOwner: 'tm-002',
    createdAt: daysAgo(520),
    updatedAt: hoursAgo(12),
  },
  {
    id: 'acc-007',
    name: 'Swift Logistics',
    arr: 125000,
    baselineArr: 125000,
    healthScore: 62,
    lastActivity: daysAgo(3),
    sentiment: 'neutral',
    nrr: 100,
    industry: 'Logistics',
    tier: 'mid-market',
    status: 'active',
    website: 'https://swiftlogistics.com',
    csmOwner: 'tm-004',
    createdAt: daysAgo(150),
    updatedAt: daysAgo(3),
  },
  {
    id: 'acc-008',
    name: 'Elevate Marketing',
    arr: 75000,
    baselineArr: 55000,
    healthScore: 95,
    lastActivity: hoursAgo(1),
    sentiment: 'positive',
    nrr: 140,
    industry: 'Marketing',
    tier: 'startup',
    status: 'active',
    website: 'https://elevatemktg.com',
    csmOwner: 'tm-003',
    createdAt: daysAgo(90),
    updatedAt: hoursAgo(1),
  },
]

// Mock contacts
export const initialContacts: Contact[] = [
  { id: 'c1', accountId: 'acc-001', name: 'Sarah Chen', role: 'VP Engineering', email: 'sarah@acme.com', isPrimary: true, isChampion: true, lastContacted: hoursAgo(2), createdAt: daysAgo(365) },
  { id: 'c2', accountId: 'acc-001', name: 'Mike Johnson', role: 'Product Manager', email: 'mike@acme.com', isPrimary: false, isChampion: false, lastContacted: daysAgo(5), createdAt: daysAgo(200) },
  { id: 'c3', accountId: 'acc-002', name: 'David Park', role: 'CTO', email: 'david@techflow.io', isPrimary: true, isChampion: false, lastContacted: daysAgo(1), createdAt: daysAgo(280) },
  { id: 'c4', accountId: 'acc-002', name: 'Lisa Wang', role: 'Engineering Lead', email: 'lisa@techflow.io', isPrimary: false, isChampion: true, lastContacted: daysAgo(7), createdAt: daysAgo(150) },
  { id: 'c5', accountId: 'acc-003', name: 'Rachel Green', role: 'Head of Operations', email: 'rachel@cloudscale.com', isPrimary: true, isChampion: false, lastContacted: daysAgo(5), createdAt: daysAgo(450) },
  { id: 'c6', accountId: 'acc-004', name: 'James Wilson', role: 'Director of IT', email: 'james@dataprime.health', isPrimary: true, isChampion: true, lastContacted: hoursAgo(6), createdAt: daysAgo(180) },
  { id: 'c7', accountId: 'acc-004', name: 'Anna Martinez', role: 'Data Scientist', email: 'anna@dataprime.health', isPrimary: false, isChampion: false, lastContacted: daysAgo(10), createdAt: daysAgo(120) },
  { id: 'c8', accountId: 'acc-005', name: 'Tom Bradley', role: 'IT Manager', email: 'tom@nexusretail.com', isPrimary: true, isChampion: false, lastContacted: daysAgo(14), createdAt: daysAgo(320) },
  { id: 'c9', accountId: 'acc-006', name: 'Dr. Emily Foster', role: 'Research Director', email: 'emily@quantumlabs.io', isPrimary: true, isChampion: true, lastContacted: hoursAgo(12), createdAt: daysAgo(520) },
  { id: 'c10', accountId: 'acc-006', name: 'Marcus Lee', role: 'Lab Manager', email: 'marcus@quantumlabs.io', isPrimary: false, isChampion: false, lastContacted: daysAgo(3), createdAt: daysAgo(400) },
  { id: 'c11', accountId: 'acc-007', name: "Kevin O'Brien", role: 'Operations Director', email: 'kevin@swiftlogistics.com', isPrimary: true, isChampion: false, lastContacted: daysAgo(3), createdAt: daysAgo(150) },
  { id: 'c12', accountId: 'acc-008', name: 'Sophie Turner', role: 'CEO', email: 'sophie@elevatemktg.com', isPrimary: true, isChampion: true, lastContacted: hoursAgo(1), createdAt: daysAgo(90) },
  { id: 'c13', accountId: 'acc-008', name: 'Jake Miller', role: 'Marketing Lead', email: 'jake@elevatemktg.com', isPrimary: false, isChampion: false, lastContacted: daysAgo(2), createdAt: daysAgo(60) },
]

// Mock activities/timeline events
export const initialActivities: TimelineEvent[] = [
  { id: 't1', accountId: 'acc-001', type: 'meeting', title: 'QBR Meeting', description: 'Quarterly business review - discussed expansion plans', timestamp: hoursAgo(2), tags: ['Check-in'] },
  { id: 't2', accountId: 'acc-001', type: 'email', title: 'Feature Request Follow-up', description: 'Sent detailed roadmap for requested features', timestamp: daysAgo(3) },
  { id: 't3', accountId: 'acc-001', type: 'login', title: 'Product Usage', description: 'Team logged 847 sessions this week', timestamp: daysAgo(1), isSystemGenerated: true },
  { id: 't4', accountId: 'acc-002', type: 'support', title: 'Support Ticket Resolved', description: 'Integration issue fixed within SLA', timestamp: daysAgo(1), tags: ['Bug'] },
  { id: 't5', accountId: 'acc-002', type: 'slack', title: 'Slack Thread', description: 'Quick question about billing cycle', timestamp: daysAgo(2) },
  { id: 't6', accountId: 'acc-002', type: 'call', title: 'Check-in Call', description: 'Monthly sync with engineering team', timestamp: daysAgo(7), tags: ['Check-in'] },
  { id: 't7', accountId: 'acc-003', type: 'support', title: 'Escalated Ticket', description: 'Performance issues reported - engineering investigating', timestamp: daysAgo(2), tags: ['Escalation'], healthImpact: -5 },
  { id: 't8', accountId: 'acc-003', type: 'email', title: 'Renewal Discussion', description: 'Concerns raised about pricing for next term', timestamp: daysAgo(5) },
  { id: 't9', accountId: 'acc-004', type: 'meeting', title: 'Expansion Planning', description: 'Discussed adding 50 more seats', timestamp: hoursAgo(6), tags: ['Onboarding'] },
  { id: 't10', accountId: 'acc-004', type: 'login', title: 'Heavy Usage', description: 'Team increased usage by 40% this month', timestamp: daysAgo(1), isSystemGenerated: true, healthImpact: 5 },
  { id: 't11', accountId: 'acc-005', type: 'email', title: 'No Response', description: 'Third follow-up email sent - no reply', timestamp: daysAgo(7), tags: ['Escalation'] },
  { id: 't12', accountId: 'acc-005', type: 'support', title: 'Multiple Tickets', description: '5 unresolved support tickets', timestamp: daysAgo(14), tags: ['Bug'], healthImpact: -10 },
  { id: 't13', accountId: 'acc-006', type: 'meeting', title: 'Product Demo', description: 'Showcased new ML features to research team', timestamp: hoursAgo(12), tags: ['Training'] },
  { id: 't14', accountId: 'acc-006', type: 'slack', title: 'Positive Feedback', description: 'Team expressed excitement about new capabilities', timestamp: daysAgo(1), healthImpact: 5 },
  { id: 't15', accountId: 'acc-007', type: 'call', title: 'Renewal Call', description: 'Discussed renewal terms - needs internal approval', timestamp: daysAgo(3), tags: ['Check-in'] },
  { id: 't16', accountId: 'acc-007', type: 'email', title: 'Proposal Sent', description: 'Renewal proposal with 5% discount', timestamp: daysAgo(4) },
  { id: 't17', accountId: 'acc-008', type: 'login', title: 'Power Users', description: 'Team logged in 120 times today', timestamp: hoursAgo(1), isSystemGenerated: true },
  { id: 't18', accountId: 'acc-008', type: 'meeting', title: 'Success Story', description: 'Discussed featuring them in case study', timestamp: daysAgo(2), tags: ['Feature Request'] },
]

// Mock opportunities
export const initialOpportunities: Opportunity[] = [
  { id: 'o1', accountId: 'acc-001', product: 'Enterprise Analytics', potentialArr: 75000, probability: 85, status: 'proposed', expectedCloseDate: daysAgo(-30), createdAt: daysAgo(60), updatedAt: daysAgo(5) },
  { id: 'o2', accountId: 'acc-001', product: 'API Access Tier', potentialArr: 25000, probability: 60, status: 'qualifying', createdAt: daysAgo(30), updatedAt: daysAgo(10) },
  { id: 'o3', accountId: 'acc-002', product: 'Premium Support', potentialArr: 40000, probability: 70, status: 'identified', createdAt: daysAgo(14), updatedAt: daysAgo(7) },
  { id: 'o4', accountId: 'acc-004', product: 'Additional Seats (50)', potentialArr: 45000, probability: 90, status: 'negotiating', expectedCloseDate: daysAgo(-14), createdAt: daysAgo(45), updatedAt: hoursAgo(6) },
  { id: 'o5', accountId: 'acc-004', product: 'Data Warehouse Integration', potentialArr: 30000, probability: 75, status: 'proposed', createdAt: daysAgo(20), updatedAt: daysAgo(3) },
  { id: 'o6', accountId: 'acc-006', product: 'ML Pipeline Add-on', potentialArr: 60000, probability: 80, status: 'qualifying', createdAt: daysAgo(25), updatedAt: hoursAgo(12) },
  { id: 'o7', accountId: 'acc-007', product: 'Real-time Tracking', potentialArr: 20000, probability: 45, status: 'identified', createdAt: daysAgo(10), updatedAt: daysAgo(5) },
  { id: 'o8', accountId: 'acc-008', product: 'Agency Tools Suite', potentialArr: 35000, probability: 88, status: 'negotiating', expectedCloseDate: daysAgo(-7), createdAt: daysAgo(35), updatedAt: daysAgo(1) },
]

// Churn prediction data (12 months)
export const churnData: ChurnDataPoint[] = [
  { month: 'Feb', predicted: 2.1, actual: 1.8 },
  { month: 'Mar', predicted: 2.3, actual: 2.5 },
  { month: 'Apr', predicted: 1.9, actual: 1.7 },
  { month: 'May', predicted: 2.0, actual: 2.1 },
  { month: 'Jun', predicted: 1.8, actual: 1.6 },
  { month: 'Jul', predicted: 2.2, actual: 2.0 },
  { month: 'Aug', predicted: 2.5, actual: 2.3 },
  { month: 'Sep', predicted: 2.1, actual: 1.9 },
  { month: 'Oct', predicted: 1.7, actual: 1.8 },
  { month: 'Nov', predicted: 1.9, actual: 1.7 },
  { month: 'Dec', predicted: 2.4, actual: 2.2 },
  { month: 'Jan', predicted: 2.0, actual: null },
]

// Activity tags
export const activityTags = [
  'Onboarding',
  'Training',
  'Bug',
  'Feature Request',
  'Check-in',
  'Escalation',
]

// Industry options
export const industries: Industry[] = [
  'Technology',
  'Healthcare',
  'Finance',
  'Retail',
  'Manufacturing',
  'Media',
  'Research',
  'Logistics',
  'Marketing',
  'SaaS',
  'Other',
]

// ===============================
// HELPER FUNCTIONS
// ===============================

// Get health status from score
export function getHealthStatus(score: number, thresholds = { healthy: 70, atRisk: 50 }): HealthStatus {
  if (score >= thresholds.healthy) return 'healthy'
  if (score >= thresholds.atRisk) return 'neutral'
  if (score >= 30) return 'at-risk'
  return 'critical'
}

// Get sentiment from health score
export function getSentimentFromHealth(score: number): Sentiment {
  if (score >= 80) return 'positive'
  if (score >= 50) return 'neutral'
  if (score >= 30) return 'negative'
  return 'critical'
}

// Format currency
export function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`
  }
  return `$${value.toLocaleString()}`
}

// Format relative time
export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Calculate health score based on activities
export function calculateHealthScore(
  accountId: string,
  activities: TimelineEvent[],
  weights = { recency: 30, engagement: 40, support: 30 },
  tier?: Tier
): number {
  const accountActivities = activities.filter(a => a.accountId === accountId)
  const now = new Date()
  
  // 1. Recency Score (30% weight by default)
  const lastActivityDate = accountActivities.length > 0
    ? new Date(Math.max(...accountActivities.map(a => a.timestamp.getTime())))
    : null
  
  let recencyScore = 0
  if (lastActivityDate) {
    const daysSinceActivity = Math.floor((now.getTime() - lastActivityDate.getTime()) / 86400000)
    if (daysSinceActivity <= 7) recencyScore = 100
    else if (daysSinceActivity <= 14) recencyScore = 90
    else if (daysSinceActivity <= 30) recencyScore = 70
    else if (daysSinceActivity <= 60) recencyScore = 50
    else if (daysSinceActivity <= 90) recencyScore = 25
    else recencyScore = 0
  }
  
  // 2. Engagement Score (40% weight by default)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)
  const recentActivities = accountActivities.filter(a => a.timestamp >= thirtyDaysAgo)
  const activityCount = recentActivities.length
  let engagementScore = Math.min(activityCount * 8, 100)
  
  // Bonus for multiple contact types
  const contactTypes = new Set(recentActivities.map(a => a.type))
  if (contactTypes.has('email') && contactTypes.has('meeting') && contactTypes.has('call')) {
    engagementScore = Math.min(engagementScore + 10, 100)
  }
  
  // 3. Support Health (30% weight by default)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000)
  const supportActivities = accountActivities.filter(a => a.type === 'support')
  const recentSupportTickets = supportActivities.filter(a => a.timestamp >= sevenDaysAgo).length
  const openTickets = supportActivities.filter(a => 
    a.timestamp >= thirtyDaysAgo && !a.description.toLowerCase().includes('resolved')
  ).length
  
  let supportScore = 100
  supportScore -= openTickets * 15
  supportScore -= recentSupportTickets * 5
  supportScore = Math.max(supportScore, 0)
  
  // Calculate weighted average
  const totalWeight = weights.recency + weights.engagement + weights.support
  let healthScore = Math.round(
    (recencyScore * weights.recency + engagementScore * weights.engagement + supportScore * weights.support) / totalWeight
  )
  
  // Enterprise tier bonus
  if (tier === 'enterprise') {
    healthScore = Math.min(healthScore + 5, 100)
  }
  
  return healthScore
}

// Calculate NRR for an account
export function calculateNRR(currentArr: number, baselineArr: number): number {
  if (baselineArr === 0) return 100
  return Math.round((currentArr / baselineArr) * 100)
}

// Calculate portfolio metrics
export function calculatePortfolioMetrics(accounts: Account[]) {
  const activeAccounts = accounts.filter(a => a.status !== 'archived' && a.status !== 'churned')
  return {
    totalArr: activeAccounts.reduce((sum, acc) => sum + acc.arr, 0),
    averageNrr: activeAccounts.length > 0 
      ? Math.round(activeAccounts.reduce((sum, acc) => sum + acc.nrr, 0) / activeAccounts.length)
      : 0,
    averageHealthScore: activeAccounts.length > 0
      ? Math.round(activeAccounts.reduce((sum, acc) => sum + acc.healthScore, 0) / activeAccounts.length)
      : 0,
    accountsAtRisk: activeAccounts.filter(acc => acc.healthScore < 50).length,
    totalAccounts: activeAccounts.length,
  }
}

// Calculate pipeline value from opportunities
export function calculatePipelineValue(opportunities: Opportunity[]): number {
  return opportunities
    .filter(o => o.status !== 'closed-won' && o.status !== 'closed-lost')
    .reduce((sum, o) => sum + (o.potentialArr * o.probability / 100), 0)
}

// Get avatar color from name
export function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-teal-500',
    'bg-indigo-500',
    'bg-rose-500',
  ]
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Validate email format
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Validate URL format
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Check if account has churn risk
export function checkChurnRisk(account: Account, activities: TimelineEvent[]): 'high' | 'medium' | 'low' | undefined {
  const accountActivities = activities.filter(a => a.accountId === account.id)
  const now = new Date()
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000)
  const hasRecentActivity = accountActivities.some(a => a.timestamp >= fourteenDaysAgo)
  
  if (account.healthScore < 50 && !hasRecentActivity && account.nrr < 95 && account.status === 'active') {
    return 'high'
  }
  if (account.healthScore < 60 && account.nrr < 100) {
    return 'medium'
  }
  return undefined
}
