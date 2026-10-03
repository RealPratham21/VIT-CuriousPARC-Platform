'use client'

import { LayoutDashboard, Users, BarChart3, Settings, Orbit } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ViewType = 'dashboard' | 'accounts' | 'analytics' | 'settings'

interface CommandDockProps {
  activeView: ViewType
  onViewChange: (view: ViewType) => void
}

const navItems: { id: ViewType; icon: typeof LayoutDashboard; label: string }[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'accounts', icon: Users, label: 'Accounts' },
  { id: 'analytics', icon: BarChart3, label: 'Analytics' },
  { id: 'settings', icon: Settings, label: 'Settings' },
]

export function CommandDock({ activeView, onViewChange }: CommandDockProps) {
  return (
    <div className="w-[60px] h-full flex flex-col items-center py-5 bg-card/80 backdrop-blur-sm">
      {/* Logo */}
      <div className="mb-10">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
          <Orbit className="w-[18px] h-[18px] text-primary" strokeWidth={1.5} />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center gap-1">
        {navItems.map((item) => {
          const isActive = activeView === item.id
          const Icon = item.icon

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                'relative w-10 h-10 flex items-center justify-center rounded-md transition-all duration-150 group',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground/70 hover:text-foreground hover:bg-secondary/50'
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Active indicator - minimal line */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-primary rounded-r-full" />
              )}
              
              <Icon className="w-[18px] h-[18px]" strokeWidth={1.5} />

              {/* Tooltip - clean */}
              <span className="absolute left-14 px-2.5 py-1.5 bg-foreground text-background rounded-md text-[11px] font-medium opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* User avatar - refined */}
      <div className="mt-auto pt-6">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-muted to-secondary flex items-center justify-center text-[11px] font-medium text-muted-foreground">
          CS
        </div>
      </div>
    </div>
  )
}
