'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'
import ChangePasswordForm from './ChangePasswordForm'
import {
  BIO_MAX,
  type CalendarView,
  type Theme,
  type UserSettings,
} from '@/lib/user-settings'

interface AccountData {
  displayName: string
  settings: UserSettings
}

export default function AccountView() {
  const { user, refreshSession } = useAuth()
  const [data, setData] = useState<AccountData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/me/settings')
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch {
      toast.error('Failed to load your account settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const updateProfile = (patch: Partial<UserSettings['profile']>) => {
    setData((d) =>
      d ? { ...d, settings: { ...d.settings, profile: { ...d.settings.profile, ...patch } } } : d
    )
  }

  const updatePrefs = (patch: Partial<UserSettings['appPreferences']>) => {
    setData((d) =>
      d
        ? { ...d, settings: { ...d.settings, appPreferences: { ...d.settings.appPreferences, ...patch } } }
        : d
    )
  }

  const handleSave = async () => {
    if (!data) return
    setSaving(true)
    try {
      const res = await fetch('/api/me/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: data.displayName, settings: data.settings }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(body?.error || 'Failed to save')
        return
      }
      setData(body)
      toast.success('Account settings saved')
      // Refresh session so the new name + theme propagate everywhere.
      refreshSession()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !data) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  }

  const isStaff = user?.kind !== 'owner'

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My account</h2>
        <p className="text-sm text-muted-foreground">
          Your personal profile and app preferences.
        </p>
      </div>

      <div className="space-y-4 max-w-3xl">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
            <CardDescription>How you appear in the app.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="display-name">Display name</Label>
              <Input
                id="display-name"
                value={data.displayName}
                onChange={(e) => setData({ ...data, displayName: e.target.value })}
                maxLength={60}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="job-title">Job title</Label>
              <Input
                id="job-title"
                value={data.settings.profile.jobTitle}
                onChange={(e) => updateProfile({ jobTitle: e.target.value })}
                placeholder="e.g. Senior Stylist"
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="photo-url">Photo URL</Label>
              <Input
                id="photo-url"
                value={data.settings.profile.photoUrl}
                onChange={(e) => updateProfile({ photoUrl: e.target.value })}
                placeholder="https://.../photo.jpg"
                maxLength={300}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={data.settings.profile.bio}
                onChange={(e) => updateProfile({ bio: e.target.value })}
                maxLength={BIO_MAX}
                rows={3}
              />
              <p className="text-[11px] text-muted-foreground">
                {data.settings.profile.bio.length}/{BIO_MAX}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* App preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">App preferences</CardTitle>
            <CardDescription>How the app looks and behaves for you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Theme</Label>
              <Select
                value={data.settings.appPreferences.theme}
                onValueChange={(v) => updatePrefs({ theme: v as Theme })}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">Match system</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Default calendar view</Label>
              <Select
                value={data.settings.appPreferences.calendarDefaultView}
                onValueChange={(v) => updatePrefs({ calendarDefaultView: v as CalendarView })}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save Changes
          </Button>
        </div>

        {/* Password — staff only (owners manage theirs at the apex) */}
        {isStaff && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Password</CardTitle>
              <CardDescription>Change the password you use to sign in.</CardDescription>
            </CardHeader>
            <CardContent className="max-w-sm">
              <ChangePasswordForm />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
