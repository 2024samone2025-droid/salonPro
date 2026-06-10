import type { ElementType } from 'react'
import type { UserRole } from '@/lib/auth-context'
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  UserCog,
  Scissors,
  BarChart3,
  CreditCard,
} from 'lucide-react'

export type NavItem = {
  href: string
  label: string
  icon: ElementType
  roles: UserRole[]
}

// Single source of truth for app navigation — consumed by the desktop
// sidebar and the mobile tab bar / More sheet. Order matters: the first
// three items become the direct mobile tabs, the rest go in "More".
export const allNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'receptionist', 'stylist'] },
  { href: '/appointments', label: 'Appointments', icon: CalendarDays, roles: ['admin', 'receptionist', 'stylist'] },
  { href: '/customers', label: 'Customers', icon: Users, roles: ['admin', 'receptionist', 'stylist'] },
  { href: '/staff', label: 'Staff', icon: UserCog, roles: ['admin', 'receptionist'] },
  { href: '/services', label: 'Services', icon: Scissors, roles: ['admin', 'receptionist', 'stylist'] },
  { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'receptionist'] },
]

export const billingNavItem: NavItem = {
  href: '/billing',
  label: 'Billing',
  icon: CreditCard,
  roles: ['admin'],
}

export function navItemsForRole(items: NavItem[], role: UserRole | undefined): NavItem[] {
  if (!role) return []
  return items.filter((item) => item.roles.includes(role))
}
