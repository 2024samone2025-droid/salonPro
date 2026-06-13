'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import LoginPage from '@/components/salon/LoginPage'

function LoginGate() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      // Preserve ?salon= so dev-mode tenancy survives the redirect
      router.replace(`/dashboard${window.location.search}`)
    }
  }, [user, loading, router])

  return <LoginPage />
}

// Staff login surface (name + PIN), shown on a tenant host.
export default function StaffLogin() {
  return (
    <AuthProvider>
      <LoginGate />
    </AuthProvider>
  )
}
