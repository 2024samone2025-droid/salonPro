'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Lock } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import SalonSettingsTab from './SalonSettingsTab'
import UsersTab from './UsersTab'

export default function SettingsView() {
  const { user, loading } = useAuth()

  if (!loading && user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <div className="flex items-center justify-center size-16 rounded-2xl bg-muted mb-4">
          <Lock className="size-8 text-muted-foreground/40" />
        </div>
        <h3 className="text-lg font-semibold">Access Restricted</h3>
        <p className="text-sm mt-1">Settings are available for Admins only.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage your salon configuration and user accounts.
        </p>
      </div>

      <Tabs defaultValue="salon">
        <TabsList>
          <TabsTrigger value="salon">Salon</TabsTrigger>
          <TabsTrigger value="users">Users & Roles</TabsTrigger>
        </TabsList>
        <TabsContent value="salon" className="mt-4">
          <SalonSettingsTab />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UsersTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
