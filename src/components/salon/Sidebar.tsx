'use client'

import { useEffect, useState } from 'react'
import { useSalonStore, ViewTab } from '@/lib/salon-store'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  UserCog,
  Scissors,
  BarChart3,
  Menu,
  X,
  Sparkles,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const navItems: { tab: ViewTab; label: string; icon: React.ElementType }[] = [
  { tab: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { tab: 'appointments', label: 'Appointments', icon: CalendarDays },
  { tab: 'customers', label: 'Customers', icon: Users },
  { tab: 'staff', label: 'Staff', icon: UserCog },
  { tab: 'services', label: 'Services', icon: Scissors },
  { tab: 'reports', label: 'Reports', icon: BarChart3 },
]

export default function Sidebar() {
  const { activeTab, setActiveTab, sidebarOpen, setSidebarOpen, setCommandOpen } = useSalonStore()
  const [todayCount, setTodayCount] = useState<number | null>(null)

  useEffect(() => {
    // Fetch today's appointment count for the badge
    const today = new Date().toISOString().split('T')[0]
    fetch(`/api/appointments?date=${today}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTodayCount(data.length)
      })
      .catch(() => {})
  }, [activeTab])

  return (
    <>
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-3 left-3 z-50 md:hidden bg-card/80 backdrop-blur-sm shadow-sm"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-full w-64 transition-transform duration-300 md:translate-x-0 md:static md:z-auto flex flex-col',
          'bg-gradient-to-b from-emerald-900 via-emerald-950 to-teal-950 text-emerald-50',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-emerald-800/50">
          <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-600 shadow-lg shadow-emerald-900/50">
            <Sparkles className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">SalonPro</h1>
            <p className="text-xs text-emerald-300/70">Rwanda</p>
          </div>
        </div>

        {/* Search button */}
        <div className="px-3 pt-4 pb-2">
          <button
            onClick={() => setCommandOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-emerald-300/60 bg-emerald-800/30 border border-emerald-700/30 hover:bg-emerald-800/50 hover:text-emerald-200 transition-colors"
          >
            <Search className="size-4" />
            <span>Search...</span>
            <kbd className="ml-auto text-[10px] bg-emerald-800/50 px-1.5 py-0.5 rounded border border-emerald-700/40">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.tab
            return (
              <button
                key={item.tab}
                onClick={() => {
                  setActiveTab(item.tab)
                  setSidebarOpen(false)
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-emerald-700/60 text-white shadow-md shadow-emerald-900/30 border-l-3 border-emerald-400'
                    : 'text-emerald-200/70 hover:bg-emerald-800/40 hover:text-emerald-100 hover:border-l-3 hover:border-emerald-600/40 border-l-3 border-transparent'
                )}
              >
                <Icon className={cn(
                  'size-5 transition-colors',
                  isActive ? 'text-emerald-300' : 'text-emerald-400/60'
                )} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.tab === 'appointments' && todayCount !== null && (
                  <Badge className="bg-emerald-600 text-white border-0 text-xs px-1.5 py-0 min-w-[20px] justify-center">
                    {todayCount}
                  </Badge>
                )}
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-emerald-800/50">
          <p className="text-xs text-emerald-400/50">© 2025 SalonPro Rwanda</p>
          <p className="text-[10px] text-emerald-500/30 mt-1">v1.0.0</p>
        </div>
      </aside>
    </>
  )
}
