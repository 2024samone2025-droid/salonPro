'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react'
import type { SalonSettings } from '@/lib/salon-settings'
import { formatMoney } from '@/lib/utils'

export type UserRole = 'admin' | 'receptionist' | 'stylist'

export interface Permissions {
  dashboard: 'full' | 'view' | 'own' | 'none'
  appointments: 'full' | 'view' | 'own' | 'none'
  customers: 'full' | 'view' | 'none'
  staff: 'full' | 'view' | 'none'
  services: 'full' | 'view' | 'none'
  reports: 'full' | 'view' | 'none'
  canCreateAppointment: boolean
  canUpdateAppointmentStatus: boolean
  canManagePayments: boolean
  canManageStaff: boolean
  canManageServices: boolean
  canDeleteRecords: boolean
  canViewAllAppointments: boolean
}

export interface SessionUser {
  /** 'owner' = global owner account (admin via OwnerSalon link); 'staff' = per-salon User. */
  kind?: 'staff' | 'owner'
  id: string
  name: string
  role: UserRole
  staffId: string | null
  salonId: string
  /** owner accounts only */
  email?: string
  /** false = first-run product tour not yet seen (populated by /api/auth/me) */
  tourCompleted?: boolean
}

export interface SalonInfo {
  id: string
  name: string
  subdomain: string
  plan: string
  settings?: SalonSettings
}

interface AuthContextType {
  user: SessionUser | null
  permissions: Permissions | null
  loading: boolean
  salon: SalonInfo | null
  login: (name: string, pin: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
  authFetch: (url: string, options?: RequestInit) => Promise<Response>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [permissions, setPermissions] = useState<Permissions | null>(null)
  const [salon, setSalon] = useState<SalonInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const isInitialMount = useRef(true)

  const refreshSession = useCallback(async () => {
    if (!isInitialMount.current) {
      setLoading(true)
    }
    isInitialMount.current = false
    try {
      // Cookie-only: the httpOnly session cookie is sent automatically (same-origin).
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        setPermissions(data.permissions)
        setSalon(data.salon)
      } else {
        setUser(null)
        setPermissions(null)
        setSalon(null)
      }
    } catch {
      setUser(null)
      setPermissions(null)
      setSalon(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshSession()
  }, [refreshSession])

  const login = async (name: string, pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Tenant comes from the Host. In dev only, forward ?salon= if present so the
      // middleware can resolve it on a bare localhost (no 'demo' default).
      const salonParam = new URLSearchParams(window.location.search).get('salon')
      const url = salonParam ? `/api/auth/login?salon=${encodeURIComponent(salonParam)}` : '/api/auth/login'
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, pin }),
      })
      const data = await res.json()
      if (res.ok) {
        // Session is established via the httpOnly cookie set in the response.
        setUser(data.user)
        setPermissions(data.permissions)
        setSalon(data.salon)
        return { success: true }
      }
      return { success: false, error: data.error || 'Login failed' }
    } catch {
      return { success: false, error: 'Network error' }
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    setUser(null)
    setPermissions(null)
    setSalon(null)
  }

  // Cookie-only now. Kept as a thin wrapper so existing callers don't change;
  // the httpOnly session cookie rides along automatically on same-origin requests.
  const authFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    return fetch(url, options)
  }, [])

  return (
    <AuthContext.Provider value={{ user, permissions, loading, salon, login, logout, refreshSession, authFetch }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    return {
      user: null,
      permissions: null,
      loading: false,
      salon: null,
      login: async () => ({ success: false, error: 'Not initialized' }),
      logout: async () => {},
      refreshSession: async () => {},
      authFetch: async () => new Response(),
    }
  }
  return context
}

// Money formatter bound to the salon's configured display currency
export function useMoney(): (amount: number) => string {
  const { salon } = useAuth()
  const currency = salon?.settings?.currency || 'RWF'
  return useCallback((amount: number) => formatMoney(amount, currency), [currency])
}

// Helper hook for permission checks
export function usePermission(permission: keyof Permissions): boolean {
  const { permissions } = useAuth()
  if (!permissions) return false
  return permissions[permission] as boolean
}

// Helper hook for module access
export function useCanAccess(module: 'dashboard' | 'appointments' | 'customers' | 'staff' | 'services' | 'reports'): boolean {
  const { permissions } = useAuth()
  if (!permissions) return false
  const access = permissions[module]
  return access !== 'none'
}
