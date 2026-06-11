'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import { useSalonStore } from '@/lib/salon-store'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import Sidebar from '@/components/salon/Sidebar'
import CommandPalette from '@/components/salon/CommandPalette'
import MobileTabBar from '@/components/salon/MobileTabBar'
import { Triangle, Search } from 'lucide-react'
import ThemeToggle from '@/components/theme-toggle'

function Splash() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
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

function AppFrame({ children }: { children: React.ReactNode }) {
  const { user, loading, salon } = useAuth()
  const { setSalon: setStoreSalon, setCommandOpen } = useSalonStore()
  const router = useRouter()

  React.useEffect(() => {
    if (salon) {
      setStoreSalon(salon)
    }
  }, [salon, setStoreSalon])

  React.useEffect(() => {
    if (!loading && !user) {
      // Preserve ?salon= so dev-mode tenancy survives the redirect
      router.replace(`/login${window.location.search}`)
    }
  }, [loading, user, router])

  if (loading || !user) {
    return <Splash />
  }

  return (
    <>
      <Sidebar />
      <SidebarInset className="h-svh overflow-hidden flex flex-col max-md:pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-10 flex h-11 shrink-0 items-center gap-2 border-b border-sidebar-border bg-sidebar px-2 sm:px-4">
          <SidebarTrigger className="-ml-1 size-7 hidden md:flex" />
          <Separator orientation="vertical" className="h-4 hidden md:block" />
          <div className="flex items-center gap-1">
            <Triangle className="size-3 fill-foreground text-foreground" />
            <span className="text-[13px] font-medium text-muted-foreground">
              {salon?.name || 'SalonPro'}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="plain"
              size="icon"
              onClick={() => setCommandOpen(true)}
              className="md:hidden size-7 text-muted-foreground hover:text-foreground hover:bg-muted/60"
              aria-label="Open search"
            >
              <Search className="size-4" aria-hidden="true" />
            </Button>
            <ThemeToggle />
          </div>
        </header>
        <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto min-w-0">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </div>
        <footer className="border-t py-2 px-4 text-center mt-auto">
          <p className="text-[11px] text-muted-foreground font-mono">
            © {new Date().getFullYear()} {salon?.name || 'SalonPro'}
          </p>
        </footer>
      </SidebarInset>
      <CommandPalette />
      <MobileTabBar />
    </>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AuthProvider>
        <AppFrame>{children}</AppFrame>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </SidebarProvider>
  )
}
