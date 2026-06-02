'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

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
}

interface AuthContextType {
  user: SessionUser | null
  permissions: Permissions | null
  loading: boolean
  login: (name: string, pin: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
  /** Fetch wrapper that includes the session token */
  authFetch: (url: string, options?: RequestInit) => Promise<Response>
}

const AuthContext = createContext<AuthContextType | null>(null)

const TOKEN_KEY = 'salonpro_token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [permissions, setPermissions] = useState<Permissions | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshSession = useCallback(async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY)
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch('/api/auth/me', { headers })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        setPermissions(data.permissions)
      } else {
        setUser(null)
        setPermissions(null)
        localStorage.removeItem(TOKEN_KEY)
      }
    } catch {
      setUser(null)
      setPermissions(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshSession()
  }, [refreshSession])

  const login = async (name: string, pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, pin }),
      })
      const data = await res.json()
      if (res.ok) {
        // Store user and permissions from login response
        setUser(data.user)
        setPermissions(data.permissions)
        // Store the token in localStorage for Authorization header fallback
        if (data.token) {
          localStorage.setItem(TOKEN_KEY, data.token)
        }
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
    localStorage.removeItem(TOKEN_KEY)
  }

  /**
   * Authenticated fetch that includes the session token via Authorization header.
   * This works even in iframe/sandbox environments where cookies may not be sent.
   */
  const authFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const token = localStorage.getItem(TOKEN_KEY)
    const headers = new Headers(options.headers || {})
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    return fetch(url, { ...options, headers })
  }, [])

  return (
    <AuthContext.Provider value={{ user, permissions, loading, login, logout, refreshSession, authFetch }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
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
