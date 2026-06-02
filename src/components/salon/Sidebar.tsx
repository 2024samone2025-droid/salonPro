'use client'

import { useEffect, useState } from 'react'
import { useSalonStore, ViewTab } from '@/lib/salon-store'
import { useAuth, type UserRole } from '@/lib/auth-context'
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
  LogOut,
  Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const allNavItems: { tab: ViewTab; label: string; icon: React.ElementType; roles: UserRole[] }[] = [
  { tab: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'receptionist', 'stylist'] },
  { tab: 'appointments', label: 'Appointments', icon: CalendarDays, roles: ['admin', 'receptionist', 'stylist'] },
  { tab: 'customers', label: 'Customers', icon: Users, roles: ['admin', 'receptionist', 'stylist'] },
  { tab: 'staff', label: 'Staff', icon: UserCog, roles: ['admin', 'receptionist'] },
  { tab: 'services', label: 'Services', icon: Scissors, roles: ['admin', 'receptionist', 'stylist'] },
  { tab: 'reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'receptionist'] },
]

const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  receptionist: 'Receptionist',
  stylist: 'Stylist',
}

const roleColors: Record<UserRole, string> = {
  admin: 'bg-amber-100 text-amber-800 border-amber-200',
  receptionist: 'bg-purple-100 text-purple-800 border-purple-200',
  stylist: 'bg-teal-100 text-teal-800 border-teal-200',
}

export default function Sidebar() {
  const { activeTab, setActiveTab, sidebarOpen, setSidebarOpen, setCommandOpen } = useSalonStore()
  const { user, permissions, logout } = useAuth()
  const [todayCount, setTodayCount] = useState<number | null>(null)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    fetch(`/api/appointments?date=${today}`)
      .then((r) => {
        if (!r.ok) return []
        return r.json()
      })
      .then((data) => {
        if (Array.isArray(data)) setTodayCount(data.length)
      })
      .catch(() => {})
  }, [activeTab])

  // Filter nav items based on user role
  const navItems = allNavItems.filter((item) => {
    if (!user) return false
    return item.roles.includes(user.role as UserRole)
  })

  const handleLogout = async () => {
    await logout()
  }

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

        {/* User info & Logout */}
        <div className="px-4 py-4 border-t border-emerald-800/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center size-9 rounded-full bg-emerald-700/50 shrink-0">
              <Shield className="size-4 text-emerald-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-emerald-100 truncate">{user?.name || 'User'}</p>
              <Badge className={`${roleColors[user?.role as UserRole] || ''} border text-[10px] px-1.5 py-0`}>
                {roleLabels[user?.role as UserRole] || user?.role}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-emerald-400/70 hover:text-red-300 hover:bg-red-900/20 transition-colors"
            onClick={handleLogout}
          >
            <LogOut className="size-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-emerald-800/50">
          <p className="text-[10px] text-emerald-500/30">v1.1.0 • Access Control</p>
        </div>
      </aside>
    </>
  )
}
