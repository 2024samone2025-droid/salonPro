'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSalonStore } from '@/lib/salon-store'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import ChangePasswordForm from '@/components/salon/ChangePasswordForm'
import { Triangle, Search, LogOut, CreditCard, Settings, KeyRound } from 'lucide-react'
import { allNavItems, navItemsForRole } from '@/components/salon/nav-items'

const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  receptionist: 'Receptionist',
  stylist: 'Stylist',
}

export default function SalonSidebar() {
  const { setCommandOpen } = useSalonStore()
  const { user, logout, authFetch } = useAuth()
  const pathname = usePathname()
  const [todayCount, setTodayCount] = useState<number | null>(null)
  const [passwordOpen, setPasswordOpen] = useState(false)

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
  }, [pathname, authFetch])

  const navItems = navItemsForRole(allNavItems, user?.role as UserRole | undefined)

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
            <span className="text-body font-semibold text-sidebar-foreground leading-none">SalonPro</span>
            <span className="text-micro text-sidebar-foreground/40 leading-none">Rwanda</span>
          </div>
        </div>
      </SidebarHeader>

      {/* Search command button */}
      <div className="px-3 pt-3 pb-1">
        <Button
          variant="outline"
          onClick={() => setCommandOpen(true)}
          className="h-auto w-full justify-start gap-2 rounded-md border-sidebar-border bg-sidebar-accent px-2.5 py-1.5 text-body font-normal text-sidebar-foreground/50 shadow-none hover:border-sidebar-foreground/20 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground/70 dark:border-sidebar-border dark:bg-sidebar-accent dark:hover:bg-sidebar-accent/80"
          aria-label="Open search command (⌘K)"
        >
          <Search className="size-3.5" aria-hidden="true" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="text-micro text-sidebar-foreground/30 px-1.5 py-0.5 rounded border border-sidebar-border font-mono" aria-hidden="true">
            ⌘K
          </kbd>
        </Button>
      </div>

      {/* Navigation */}
      <SidebarContent className="px-2 pt-1">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-caption font-medium uppercase tracking-widest px-2">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={cn(
                        "group relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-body transition-colors duration-150",
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                          : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground/90'
                      )}
                    >
                      <Link href={item.href} data-tour={`nav${item.href.replace('/', '-')}`}>
                        <Icon
                          className={cn(
                            "size-4 transition-colors",
                            isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70'
                          )}
                          aria-hidden="true"
                        />
                        <span>{item.label}</span>
                        {item.href === '/appointments' && todayCount !== null && (
                          <SidebarMenuBadge className="bg-sidebar-primary text-sidebar-primary-foreground border-0 text-micro min-w-[18px] h-[18px] justify-center font-medium">
                            {todayCount}
                          </SidebarMenuBadge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: User info & Logout */}
      <SidebarFooter className="px-3 pb-10 pt-2">
        <div className="border-t border-sidebar-border pt-3">
          <div className="flex items-center gap-2.5 px-1 mb-2">
            <Avatar className="size-7 border border-sidebar-border">
              <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground/70 text-caption font-medium">
                {user?.name ? getInitials(user.name) : '??'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-body font-medium text-sidebar-foreground truncate leading-tight">
                {user?.name || 'User'}
              </p>
              <p className="text-caption text-sidebar-foreground/40 leading-tight">
                {roleLabels[user?.role as UserRole] || user?.role}
              </p>
            </div>
          </div>
          {user?.kind !== 'owner' && (
            <Button
              variant="plain"
              size="sm"
              className="w-full justify-start text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors text-body h-8"
              onClick={() => setPasswordOpen(true)}
              aria-label="Change password"
            >
              <KeyRound className="size-3.5 mr-2" aria-hidden="true" />
              Change password
            </Button>
          )}
          <Button
            variant="plain"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors text-body h-8"
            onClick={handleLogout}
            aria-label="Sign out"
          >
            <LogOut className="size-3.5 mr-2" aria-hidden="true" />
            Sign out
          </Button>
          {user?.role === 'admin' && (
            <>
              <Button
                asChild
                variant="plain"
                size="sm"
                className="w-full justify-start text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors text-body h-8"
              >
                <Link href="/settings" aria-label="Settings">
                  <Settings className="size-3.5 mr-2" aria-hidden="true" />
                  Settings
                </Link>
              </Button>
              <Button
                asChild
                variant="plain"
                size="sm"
                className="w-full justify-start text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors text-body h-8"
              >
                <Link href="/billing" aria-label="Billing">
                  <CreditCard className="size-3.5 mr-2" aria-hidden="true" />
                  Billing
                </Link>
              </Button>
            </>
          )}
          <p className="text-micro text-sidebar-foreground/20 text-center mt-1.5 font-mono">
            v1.3.0
          </p>
        </div>
      </SidebarFooter>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>
              Enter your current password, then choose a new one.
            </DialogDescription>
          </DialogHeader>
          <ChangePasswordForm onSuccess={() => setPasswordOpen(false)} />
        </DialogContent>
      </Dialog>
    </Sidebar>
  )
}
