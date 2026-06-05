'use client'

import { useEffect, useState } from 'react'
import { useSalonStore, type ViewTab } from '@/lib/salon-store'
import { useAuth, type UserRole } from '@/lib/auth-context'
import { cn } from '@/lib/utils'
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
  Triangle,
  Search,
  LogOut,
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
      className="border-r border-sidebar-border bg-sidebar"
    >
      {/* Header: Logo */}
      <SidebarHeader className="h-11 px-4 flex items-center border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center size-7 rounded-md bg-sidebar-primary shrink-0">
            <Triangle className="size-4 text-sidebar-primary-foreground fill-sidebar-primary-foreground" aria-hidden="true" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[13px] font-semibold text-sidebar-foreground leading-none">SalonPro</span>
            <span className="text-[10px] text-sidebar-foreground/40 leading-none">Rwanda</span>
          </div>
        </div>
      </SidebarHeader>

      {/* Search command button */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={() => setCommandOpen(true)}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] text-sidebar-foreground/50 bg-sidebar-accent border border-sidebar-border hover:bg-sidebar-accent/80 hover:text-sidebar-foreground/70 hover:border-sidebar-foreground/20 transition-colors"
          aria-label="Open search command (⌘K)"
        >
          <Search className="size-3.5" aria-hidden="true" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="text-[10px] text-sidebar-foreground/30 px-1.5 py-0.5 rounded border border-sidebar-border font-mono" aria-hidden="true">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Navigation */}
      <SidebarContent className="px-2 pt-1">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[11px] font-medium uppercase tracking-widest px-2">
            Menu
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
                      className={cn(
                        "group relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors duration-150",
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                          : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground/90'
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-4 transition-colors",
                          isActive ? 'text-sidebar-accent-foreground' : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70'
                        )}
                        aria-hidden="true"
                      />
                      <span>{item.label}</span>
                      {item.tab === 'appointments' && todayCount !== null && (
                        <SidebarMenuBadge className="bg-sidebar-primary text-sidebar-primary-foreground border-0 text-[10px] min-w-[18px] h-[18px] justify-center font-medium">
                          {todayCount}
                        </SidebarMenuBadge>
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
      <SidebarFooter className="px-3 pb-3 pt-2">
        <div className="border-t border-sidebar-border pt-3">
          <div className="flex items-center gap-2.5 px-1 mb-2">
            <Avatar className="size-7 border border-sidebar-border">
              <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground/70 text-[11px] font-medium">
                {user?.name ? getInitials(user.name) : '??'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-sidebar-foreground truncate leading-tight">
                {user?.name || 'User'}
              </p>
              <p className="text-[11px] text-sidebar-foreground/40 leading-tight">
                {roleLabels[user?.role as UserRole] || user?.role}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors text-[13px] h-8"
            onClick={handleLogout}
            aria-label="Sign out"
          >
            <LogOut className="size-3.5 mr-2" aria-hidden="true" />
            Sign Out
          </Button>
          <p className="text-[10px] text-sidebar-foreground/20 text-center mt-1.5 font-mono">
            v1.3.0
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
