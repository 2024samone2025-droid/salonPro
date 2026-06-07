'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react'

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
  id: string
  name: string
  role: UserRole
  staffId: string | null
  salonId: string
}

interface AuthContextType {
  user: SessionUser | null
  permissions: Permissions | null
  loading: boolean
  salon: { id: string; name: string; subdomain: string; plan: string } | null
  login: (name: string, pin: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
  authFetch: (url: string, options?: RequestInit) => Promise<Response>
}

const AuthContext = createContext<AuthContextType | null>(null)

const TOKEN_KEY = 'salonpro_token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [permissions, setPermissions] = useState<Permissions | null>(null)
  const [salon, setSalon] = useState<{ id: string; name: string; subdomain: string; plan: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const isInitialMount = useRef(true)

  const refreshSession = useCallback(async () => {
    if (!isInitialMount.current) {
      setLoading(true)
    }
    isInitialMount.current = false
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch('/api/auth/me', { headers })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        setPermissions(data.permissions)
        setSalon(data.salon)
      } else {
        setUser(null)
        setPermissions(null)
        setSalon(null)
        localStorage.removeItem(TOKEN_KEY)
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
      // Include salon param for dev mode
      const salonParam = new URLSearchParams(window.location.search).get('salon') || 'demo'
      const res = await fetch(`/api/auth/login?salon=${salonParam}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, pin }),
      })
      const data = await res.json()
      if (res.ok) {
        setUser(data.user)
        setPermissions(data.permissions)
        if (data.token) {
          localStorage.setItem(TOKEN_KEY, data.token)
        }
        // Salon info is already in response
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
    localStorage.removeItem(TOKEN_KEY)
  }

  const authFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
    const headers = new Headers(options.headers || {})
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    return fetch(url, { ...options, headers })
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
