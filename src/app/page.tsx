'use client'

import { AuthProvider, useAuth } from '@/lib/auth-context'
import { useSalonStore } from '@/lib/salon-store'
import Sidebar from '@/components/salon/Sidebar'
import DashboardView from '@/components/salon/DashboardView'
import AppointmentsView from '@/components/salon/AppointmentsView'
import CustomersView from '@/components/salon/CustomersView'
import StaffView from '@/components/salon/StaffView'
import ServicesView from '@/components/salon/ServicesView'
import ReportsView from '@/components/salon/ReportsView'
import CommandPalette from '@/components/salon/CommandPalette'
import LoginPage from '@/components/salon/LoginPage'
import { Skeleton } from '@/components/ui/skeleton'

function MainContent() {
  const { activeTab } = useSalonStore()

  switch (activeTab) {
    case 'dashboard':
      return <DashboardView />
    case 'appointments':
      return <AppointmentsView />
    case 'customers':
      return <CustomersView />
    case 'staff':
      return <StaffView />
    case 'services':
      return <ServicesView />
    case 'reports':
      return <ReportsView />
    default:
      return <DashboardView />
  }
}

function AuthenticatedApp() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50/50 via-background to-teal-50/30">
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 overflow-auto min-w-0">
          <MainContent />
        </main>
      </div>
      <footer className="border-t bg-card/80 backdrop-blur-sm py-3 px-6 text-center mt-auto">
        <p className="text-xs text-muted-foreground">
          © 2025 <span className="font-semibold text-emerald-700">SalonPro Rwanda</span> — Salon Management System
        </p>
      </footer>
      <CommandPalette />
    </div>
  )
}

function AppShell() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-background to-teal-50">
        <div className="space-y-4 text-center">
          <div className="size-12 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return <AuthenticatedApp />
}

export default function Home() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}
