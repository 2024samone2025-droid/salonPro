'use client'

import { useEffect, useState, useRef } from 'react'
import { useSalonStore, ViewTab } from '@/lib/salon-store'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  UserCog,
  Scissors,
  BarChart3,
  Search,
  Loader2,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'

const navItems: { tab: ViewTab; label: string; icon: React.ElementType }[] = [
  { tab: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { tab: 'appointments', label: 'Appointments', icon: CalendarDays },
  { tab: 'customers', label: 'Customers', icon: Users },
  { tab: 'staff', label: 'Staff', icon: UserCog },
  { tab: 'services', label: 'Services', icon: Scissors },
  { tab: 'reports', label: 'Reports', icon: BarChart3 },
]

interface CustomerResult {
  id: string
  name: string
  phone: string
}

interface AppointmentResult {
  id: string
  date: string
  startTime: string
  customer: { name: string }
  service: { name: string }
}

export default function CommandPalette() {
  const { commandOpen, setCommandOpen, setActiveTab } = useSalonStore()
  const { authFetch } = useAuth()
  const [customers, setCustomers] = useState<CustomerResult[]>([])
  const [appointments, setAppointments] = useState<AppointmentResult[]>([])
  const [loading, setLoading] = useState(false)
  const isInitialMount = useRef(true)

  useEffect(() => {
    if (commandOpen) {
      if (!isInitialMount.current) {
        setLoading(true)
      }
      isInitialMount.current = false
      // Load search data when palette opens
      Promise.all([
        authFetch('/api/customers').then((r) => r.ok ? r.json() : []),
        authFetch('/api/appointments?date=' + new Date().toISOString().split('T')[0]).then((r) => r.ok ? r.json() : []),
      ]).then(([custs, apts]) => {
        setCustomers(Array.isArray(custs) ? custs : [])
        setAppointments(Array.isArray(apts) ? apts : [])
      }).finally(() => {
        setLoading(false)
      })
    }
  }, [commandOpen, authFetch])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandOpen(!commandOpen)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [commandOpen, setCommandOpen])

  const handleSelect = (tab: ViewTab) => {
    setActiveTab(tab)
    setCommandOpen(false)
  }

  return (
    <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
      <CommandInput placeholder="Search customers, appointments, or navigate..." />
      <CommandList>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="size-4 animate-spin text-muted-foreground mr-2" />
            <span className="text-sm text-muted-foreground">Loading data...</span>
          </div>
        ) : (
          <CommandEmpty>No results found.</CommandEmpty>
        )}

        {!loading && (
          <CommandGroup heading="Navigate">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <CommandItem
                  key={item.tab}
                  onSelect={() => handleSelect(item.tab)}
                >
                  <Icon className="size-4 mr-2" />
                  {item.label}
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}

        {customers.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Customers">
              {customers.slice(0, 10).map((c) => (
                <CommandItem
                  key={c.id}
                  onSelect={() => {
                    setActiveTab('customers')
                    setCommandOpen(false)
                  }}
                >
                  <Search className="size-4 mr-2" />
                  <span>{c.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{c.phone}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {appointments.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Today's Appointments">
              {appointments.slice(0, 10).map((a) => (
                <CommandItem
                  key={a.id}
                  onSelect={() => {
                    setActiveTab('appointments')
                    setCommandOpen(false)
                  }}
                >
                  <CalendarDays className="size-4 mr-2" />
                  <span>{a.customer.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {a.startTime} • {a.service.name}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
