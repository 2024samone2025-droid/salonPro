'use client'

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
import { Sparkles, Loader2 } from 'lucide-react'

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
    <>
      <Sidebar />
      <SidebarInset className="min-h-svh flex flex-col">
        <header className="flex h-12 items-center gap-2 border-b bg-background/80 backdrop-blur-sm px-3 sm:px-4 sticky top-0 z-10">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-emerald-600" />
            <span className="text-sm font-medium text-muted-foreground hidden sm:inline">SalonPro Rwanda</span>
            <span className="text-sm font-medium text-muted-foreground sm:hidden">SalonPro</span>
          </div>
        </header>
        <div className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto min-w-0">
          <MainContent />
        </div>
        <footer className="border-t bg-card/80 backdrop-blur-sm py-2 sm:py-3 px-4 sm:px-6 text-center mt-auto">
          <p className="text-xs text-muted-foreground">
            &copy; 2025 <span className="font-semibold text-emerald-700">SalonPro Rwanda</span> — Salon Management System
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-background to-teal-50">
        <div className="space-y-4 text-center">
          <div className="relative mx-auto size-12">
            <div className="absolute inset-0 rounded-full border-2 border-emerald-200" />
            <Loader2 className="absolute inset-0 size-12 text-emerald-600 animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Loading SalonPro...</p>
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
