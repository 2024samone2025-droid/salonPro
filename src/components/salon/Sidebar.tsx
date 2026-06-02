'use client'

import { useEffect, useState } from 'react'
import { useSalonStore, type ViewTab } from '@/lib/salon-store'
import { useAuth, type UserRole } from '@/lib/auth-context'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarMenuBadge,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  UserCog,
  Scissors,
  BarChart3,
  Sparkles,
  Search,
  LogOut,
  Shield,
} from 'lucide-react'

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

const roleBadgeStyles: Record<UserRole, string> = {
  admin: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  receptionist: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800',
  stylist: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800',
}

export default function SalonSidebar() {
  const { activeTab, setActiveTab, setCommandOpen } = useSalonStore()
  const { user, logout, authFetch } = useAuth()
  const [todayCount, setTodayCount] = useState<number | null>(null)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    authFetch(`/api/appointments?date=${today}`)
      .then((r) => {
        if (!r.ok) return []
        return r.json()
      })
      .then((data) => {
        if (Array.isArray(data)) setTodayCount(data.length)
      })
      .catch(() => {})
  }, [activeTab, authFetch])

  // Filter nav items based on user role
  const navItems = allNavItems.filter((item) => {
    if (!user) return false
    return item.roles.includes(user.role as UserRole)
  })

  const handleLogout = async () => {
    await logout()
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Sidebar
      collapsible="offcanvas"
      className="border-r-0"
    >
      {/* Header: Logo */}
      <SidebarHeader className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-9 rounded-lg bg-primary shadow-lg shrink-0">
            <Sparkles className="size-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-white leading-tight">SalonPro</span>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-tight">Rwanda</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator className="bg-zinc-800 dark:bg-zinc-900" />

      {/* Search Button */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={() => setCommandOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-400 bg-zinc-800/60 border border-zinc-700/50 hover:bg-zinc-800 hover:text-zinc-300 dark:bg-zinc-900/60 dark:border-zinc-800/50 dark:hover:bg-zinc-900 transition-colors"
        >
          <Search className="size-4" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="text-[10px] bg-zinc-800 dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-700/50 dark:border-zinc-800/50 font-mono">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Navigation */}
      <SidebarContent className="px-2 pt-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-zinc-500 dark:text-zinc-600 text-[11px] font-semibold uppercase tracking-wider px-1">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.tab
                return (
                  <SidebarMenuItem key={item.tab}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setActiveTab(item.tab)}
                      className={`
                        group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                        transition-all duration-200
                        ${
                          isActive
                            ? 'bg-zinc-800 dark:bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 dark:hover:bg-zinc-900'
                            : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 dark:hover:bg-zinc-900/50 dark:hover:text-zinc-300'
                        }
                      `}
                    >
                      <Icon
                        className={`size-5 transition-colors ${
                          isActive ? 'text-primary' : 'text-zinc-500 dark:text-zinc-600 group-hover:text-zinc-300 dark:group-hover:text-zinc-400'
                        }`}
                      />
                      <span>{item.label}</span>
                      {item.tab === 'appointments' && todayCount !== null && (
                        <SidebarMenuBadge className="bg-primary text-primary-foreground border-0 text-xs min-w-[20px] justify-center">
                          {todayCount}
                        </SidebarMenuBadge>
                      )}
                      {/* Active indicator */}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: User info & Logout */}
      <SidebarFooter className="px-3 pb-4 pt-2">
        <Separator className="bg-zinc-800 dark:bg-zinc-900 mb-3" />
        <div className="flex items-center gap-3 px-1 mb-2">
          <Avatar className="size-9 border border-zinc-700 dark:border-zinc-800">
            <AvatarFallback className="bg-zinc-800 dark:bg-zinc-900 text-zinc-300 dark:text-zinc-400 text-sm font-medium">
              {user?.name ? getInitials(user.name) : '??'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-200 dark:text-zinc-300 truncate">
              {user?.name || 'User'}
            </p>
            <Badge
              className={`${roleBadgeStyles[user?.role as UserRole] || ''} border text-[10px] px-1.5 py-0 mt-0.5`}
            >
              {roleLabels[user?.role as UserRole] || user?.role}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-zinc-500 dark:text-zinc-600 hover:text-red-400 hover:bg-red-950/30 transition-colors"
          onClick={handleLogout}
        >
          <LogOut className="size-4 mr-2" />
          Sign Out
        </Button>
        <p className="text-[10px] text-zinc-600 dark:text-zinc-700 text-center mt-2">
          v1.2.0 · SalonPro Rwanda
        </p>
      </SidebarFooter>
    </Sidebar>
  )
}
