'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth, type UserRole } from '@/lib/auth-context'
import { allNavItems, billingNavItem, settingsNavItem, accountNavItem, navItemsForRole } from '@/components/salon/nav-items'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { Menu, LogOut } from 'lucide-react'

const roleLabels: Record<UserRole, string> = {
  admin: 'Admin',
  receptionist: 'Receptionist',
  stylist: 'Stylist',
}

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

export default function MobileTabBar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  const role = user?.role as UserRole | undefined
  const tabItems = navItemsForRole(allNavItems.slice(0, 3), role)
  const moreItems = navItemsForRole([...allNavItems.slice(3), accountNavItem, settingsNavItem, billingNavItem], role)
  const moreActive = moreItems.some((item) => item.href === pathname)

  if (!user) return null

  return (
    <>
      <nav
        aria-label="Primary"
        className="md:hidden fixed bottom-0 left-0 right-0 z-20 border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-4">
          {tabItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                data-tour={`m-nav${item.href.replace('/', '-')}`}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 h-14 text-[10px] font-medium transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-sidebar-foreground/50 hover:text-sidebar-foreground/80'
                )}
              >
                <Icon className={cn('size-5', isActive && 'fill-primary/15')} aria-hidden="true" />
                <span>{item.label === 'Appointments' ? 'Appts' : item.label}</span>
              </Link>
            )
          })}
          <Button
            variant="plain"
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            data-tour="nav-more"
            className={cn(
              'flex h-14 flex-col items-center justify-center gap-0.5 rounded-none px-0 text-[10px] font-medium hover:bg-transparent',
              moreActive
                ? 'text-primary hover:text-primary'
                : 'text-sidebar-foreground/50 hover:text-sidebar-foreground/80'
            )}
          >
            <Menu className="size-5" aria-hidden="true" />
            <span>More</span>
          </Button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="md:hidden rounded-t-xl pb-[max(env(safe-area-inset-bottom),1rem)]">
          <SheetHeader className="pb-0">
            <SheetTitle className="text-[13px] text-muted-foreground font-medium uppercase tracking-widest">
              More
            </SheetTitle>
          </SheetHeader>
          <div className="px-2">
            {moreItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 px-3 h-11 rounded-md text-sm transition-colors',
                    isActive
                      ? 'bg-muted text-foreground font-medium'
                      : 'text-foreground/70 hover:bg-muted/60'
                  )}
                >
                  <Icon className="size-4.5 text-foreground/50" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
          <Separator />
          <div className="px-4 flex items-center gap-3">
            <Avatar className="size-8 border border-border">
              <AvatarFallback className="bg-muted text-foreground/70 text-[11px] font-medium">
                {user.name ? getInitials(user.name) : '??'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate leading-tight">{user.name}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {roleLabels[user.role as UserRole] || user.role}
              </p>
            </div>
            <Button
              variant="plain"
              size="sm"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => logout()}
              aria-label="Sign out"
            >
              <LogOut className="size-4 mr-1.5" aria-hidden="true" />
              Sign out
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
