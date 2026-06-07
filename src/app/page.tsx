'use client'

import React from 'react'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import { useSalonStore } from '@/lib/salon-store'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { Separator } from '@/components/ui/separator'
import Sidebar from '@/components/salon/Sidebar'
import DashboardView from '@/components/salon/DashboardView'
import AppointmentsView from '@/components/salon/AppointmentsView'
import CustomersView from '@/components/salon/CustomersView'
import StaffView from '@/components/salon/StaffView'
import ServicesView from '@/components/salon/ServicesView'
import ReportsView from '@/components/salon/ReportsView'
import CommandPalette from '@/components/salon/CommandPalette'
import LoginPage from '@/components/salon/LoginPage'
import { Loader2, Triangle } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

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
  const { salon } = useAuth()
  const { setSalon: setStoreSalon } = useSalonStore()

  // Sync salon to store
  React.useEffect(() => {
    if (salon) {
      setStoreSalon(salon)
    }
  }, [salon, setStoreSalon])

  return (
    <>
      <Sidebar />
      <SidebarInset className="min-h-svh flex flex-col">
        <header className="flex h-11 items-center gap-2 border-b border-sidebar-border bg-sidebar px-2 sm:px-4 fixed top-0 left-0 right-0 z-10 sm:left-[var(--sidebar-width)]">
          <SidebarTrigger className="-ml-1 size-7" />
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1">
            <Triangle className="size-3 fill-foreground text-foreground" />
            <span className="text-[13px] font-medium text-muted-foreground hidden sm:inline">
              {salon?.name || 'SalonPro'}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
          </div>
        </header>
        <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto min-w-0 pt-15">
          <MainContent />
        </div>
        <footer className="border-t py-2 px-4 text-center mt-auto">
          <p className="text-[11px] text-muted-foreground font-mono">
            © 2025 {salon?.name || 'SalonPro'}
          </p>
        </footer>
      </SidebarInset>
      <CommandPalette />
    </>
  )
}

function AppShell() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <div className="relative mx-auto">
            <Triangle className="size-8 text-foreground animate-pulse" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">SalonPro</p>
            <p className="text-xs text-muted-foreground">Loading...</p>
          </div>
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
    <SidebarProvider>
      <AuthProvider>
        <AppShell />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </SidebarProvider>
  )
}
