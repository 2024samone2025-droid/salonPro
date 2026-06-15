'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, TriangleAlert, Route } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { startTour } from '@/lib/tour'
import SalonClosures from './SalonClosures'
import {
  DAY_LABELS,
  SUPPORTED_CURRENCIES,
  type SalonSettings,
} from '@/lib/salon-settings'

interface SalonData {
  name: string
  subdomain: string
  plan: string
  settings: SalonSettings
}

export default function SalonSettingsTab() {
  const { authFetch, refreshSession, user } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<SalonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await authFetch('/api/salon/settings')
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch {
      toast.error('Failed to load salon settings')
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  useEffect(() => {
    load()
  }, [load])

  const updateSettings = (patch: Partial<SalonSettings>) => {
    setData((d) => (d ? { ...d, settings: { ...d.settings, ...patch } } : d))
  }

  const updateProfile = (patch: Partial<SalonSettings['profile']>) => {
    setData((d) =>
      d ? { ...d, settings: { ...d.settings, profile: { ...d.settings.profile, ...patch } } } : d
    )
  }

  const updateAddress = (patch: Partial<SalonSettings['profile']['address']>) => {
    setData((d) =>
      d
        ? {
            ...d,
            settings: {
              ...d.settings,
              profile: { ...d.settings.profile, address: { ...d.settings.profile.address, ...patch } },
            },
          }
        : d
    )
  }

  const updateSocial = (patch: Partial<SalonSettings['profile']['socialLinks']>) => {
    setData((d) =>
      d
        ? {
            ...d,
            settings: {
              ...d.settings,
              profile: { ...d.settings.profile, socialLinks: { ...d.settings.profile.socialLinks, ...patch } },
            },
          }
        : d
    )
  }

  const updateBookingRules = (patch: Partial<SalonSettings['bookingRules']>) => {
    setData((d) =>
      d
        ? { ...d, settings: { ...d.settings, bookingRules: { ...d.settings.bookingRules, ...patch } } }
        : d
    )
  }

  const updateDay = (day: number, patch: Partial<SalonSettings['businessHours'][string]>) => {
    setData((d) => {
      if (!d) return d
      const hours = { ...d.settings.businessHours }
      hours[String(day)] = { ...hours[String(day)], ...patch }
      return { ...d, settings: { ...d.settings, businessHours: hours } }
    })
  }

  const handleSave = async () => {
    if (!data) return
    setSaving(true)
    try {
      const res = await authFetch('/api/salon/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          subdomain: data.subdomain,
          settings: data.settings,
        }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(body?.error || 'Failed to save settings')
        return
      }
      setData(body)
      toast.success('Salon settings saved')
      // Refresh session so grid hours, salon name, etc. update everywhere
      refreshSession()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  }

  const bookingUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/book/${data.subdomain}`

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Salon profile</CardTitle>
          <CardDescription>How your salon appears to staff and customers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="salon-name">Salon name</Label>
            <Input
              id="salon-name"
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
              maxLength={60}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="salon-subdomain">Subdomain</Label>
            <Input
              id="salon-subdomain"
              value={data.subdomain}
              onChange={(e) =>
                setData({ ...data, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })
              }
              maxLength={30}
            />
            <p className="text-xs text-muted-foreground">
              Booking link: <span className="font-mono">{bookingUrl}</span>
            </p>
            <p className="text-xs text-warning flex items-center gap-1">
              <TriangleAlert className="size-3.5 shrink-0" />
              Changing the subdomain breaks booking links you have already shared.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Business details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business details</CardTitle>
          <CardDescription>
            Contact info and links shown to customers. All fields are optional.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="salon-phone">Phone</Label>
              <Input
                id="salon-phone"
                value={data.settings.profile.phone}
                onChange={(e) => updateProfile({ phone: e.target.value })}
                placeholder="+250 7.. ... ..."
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="salon-website">Website</Label>
              <Input
                id="salon-website"
                value={data.settings.profile.websiteUrl}
                onChange={(e) => updateProfile({ websiteUrl: e.target.value })}
                placeholder="https://example.com"
                maxLength={300}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="salon-logo">Logo URL</Label>
            <Input
              id="salon-logo"
              value={data.settings.profile.logoUrl}
              onChange={(e) => updateProfile({ logoUrl: e.target.value })}
              placeholder="https://.../logo.png"
              maxLength={300}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Address</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={data.settings.profile.address.street}
                onChange={(e) => updateAddress({ street: e.target.value })}
                placeholder="Street / KN .. St"
                aria-label="Street"
                maxLength={120}
              />
              <Input
                value={data.settings.profile.address.city}
                onChange={(e) => updateAddress({ city: e.target.value })}
                placeholder="City (e.g. Kigali)"
                aria-label="City"
                maxLength={120}
              />
              <Input
                value={data.settings.profile.address.district}
                onChange={(e) => updateAddress({ district: e.target.value })}
                placeholder="District (e.g. Gasabo)"
                aria-label="District"
                maxLength={120}
              />
              <Input
                value={data.settings.profile.address.country}
                onChange={(e) => updateAddress({ country: e.target.value })}
                placeholder="Country"
                aria-label="Country"
                maxLength={120}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Social links</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={data.settings.profile.socialLinks.instagram}
                onChange={(e) => updateSocial({ instagram: e.target.value })}
                placeholder="Instagram URL"
                aria-label="Instagram"
                maxLength={300}
              />
              <Input
                value={data.settings.profile.socialLinks.facebook}
                onChange={(e) => updateSocial({ facebook: e.target.value })}
                placeholder="Facebook URL"
                aria-label="Facebook"
                maxLength={300}
              />
              <Input
                value={data.settings.profile.socialLinks.tiktok}
                onChange={(e) => updateSocial({ tiktok: e.target.value })}
                placeholder="TikTok URL"
                aria-label="TikTok"
                maxLength={300}
              />
              <Input
                value={data.settings.profile.socialLinks.whatsapp}
                onChange={(e) => updateSocial({ whatsapp: e.target.value })}
                placeholder="WhatsApp number"
                aria-label="WhatsApp"
                maxLength={120}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="salon-tin">TIN (Tax ID)</Label>
              <Input
                id="salon-tin"
                value={data.settings.profile.tinNumber}
                onChange={(e) => updateProfile({ tinNumber: e.target.value })}
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="salon-license">Business license no.</Label>
              <Input
                id="salon-license"
                value={data.settings.profile.licenseNumber}
                onChange={(e) => updateProfile({ licenseNumber: e.target.value })}
                maxLength={120}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business hours */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business hours</CardTitle>
          <CardDescription>
            Online booking only offers times within these hours, and the appointments grid follows them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {DAY_LABELS.map((label, day) => {
            const hours = data.settings.businessHours[String(day)]
            return (
              <div key={label} className="flex items-center gap-3 py-1">
                <div className="w-24 text-sm">{label}</div>
                <Switch
                  checked={!hours.closed}
                  onCheckedChange={(open) => updateDay(day, { closed: !open })}
                  aria-label={`${label} open`}
                />
                {hours.closed ? (
                  <span className="text-sm text-muted-foreground">Closed</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={hours.open}
                      onChange={(e) => updateDay(day, { open: e.target.value })}
                      className="w-28 h-9"
                      aria-label={`${label} opening time`}
                    />
                    <span className="text-sm text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={hours.close}
                      onChange={(e) => updateDay(day, { close: e.target.value })}
                      className="w-28 h-9"
                      aria-label={`${label} closing time`}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Booking preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Online booking</CardTitle>
          <CardDescription>How customers book through your public page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Public booking page</p>
              <p className="text-xs text-muted-foreground">
                When off, the booking link shows &quot;Salon not found&quot; and no online bookings are accepted.
              </p>
            </div>
            <Switch
              checked={data.settings.publicBookingEnabled}
              onCheckedChange={(v) => updateSettings({ publicBookingEnabled: v })}
              aria-label="Public booking page enabled"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Time slot interval</Label>
            <Select
              value={String(data.settings.slotIntervalMinutes)}
              onValueChange={(v) =>
                updateSettings({ slotIntervalMinutes: Number(v) as SalonSettings['slotIntervalMinutes'] })
              }
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">Every 15 minutes</SelectItem>
                <SelectItem value="30">Every 30 minutes</SelectItem>
                <SelectItem value="60">Every hour</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Booking rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Booking rules</CardTitle>
          <CardDescription>
            Limits applied to customer online bookings. They don&apos;t affect bookings you make at the front desk.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="lead-time">Minimum notice (hours)</Label>
            <Input
              id="lead-time"
              type="number"
              min={0}
              max={720}
              value={data.settings.bookingRules.minLeadTimeHours}
              onChange={(e) =>
                updateBookingRules({ minLeadTimeHours: Math.max(0, parseInt(e.target.value, 10) || 0) })
              }
            />
            <p className="text-xs text-muted-foreground">How far ahead a customer must book. 0 = any open slot.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="advance-days">Bookable window (days)</Label>
            <Input
              id="advance-days"
              type="number"
              min={1}
              max={365}
              value={data.settings.bookingRules.maxAdvanceDays}
              onChange={(e) =>
                updateBookingRules({ maxAdvanceDays: Math.max(1, parseInt(e.target.value, 10) || 1) })
              }
            />
            <p className="text-xs text-muted-foreground">Furthest into the future a customer can book.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="buffer-before">Buffer before (minutes)</Label>
            <Input
              id="buffer-before"
              type="number"
              min={0}
              max={120}
              value={data.settings.bookingRules.bufferBeforeMinutes}
              onChange={(e) =>
                updateBookingRules({ bufferBeforeMinutes: Math.max(0, parseInt(e.target.value, 10) || 0) })
              }
            />
            <p className="text-xs text-muted-foreground">Gap kept free before each appointment.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="buffer-after">Buffer after (minutes)</Label>
            <Input
              id="buffer-after"
              type="number"
              min={0}
              max={120}
              value={data.settings.bookingRules.bufferAfterMinutes}
              onChange={(e) =>
                updateBookingRules({ bufferAfterMinutes: Math.max(0, parseInt(e.target.value, 10) || 0) })
              }
            />
            <p className="text-xs text-muted-foreground">Gap kept free after each appointment.</p>
          </div>
        </CardContent>
      </Card>

      {/* Closures & days off */}
      <SalonClosures />

      {/* Currency */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Currency</CardTitle>
          <CardDescription>
            Display currency for service prices and reports. Amounts are not converted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={data.settings.currency}
            onValueChange={(v) => updateSettings({ currency: v as SalonSettings['currency'] })}
          >
            <SelectTrigger className="w-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Product tour */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Product tour</CardTitle>
          <CardDescription>
            Replay the guided walkthrough of the main features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() =>
              startTour({
                role: user?.role ?? 'admin',
                navigate: (path) => router.push(path),
                onComplete: () => {
                  authFetch('/api/users/me/tour-complete', { method: 'POST' }).catch(() => {})
                },
              })
            }
          >
            <Route className="size-4 mr-1.5" />
            Replay tour
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  )
}
