'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, Plus, Trash2, CalendarOff } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'

interface DayOff {
  id: string
  date: string
  reason: string
  staffId: string | null
  staffName: string | null
}

interface StaffOption {
  id: string
  name: string
}

const SALON_SCOPE = 'salon'

function formatDate(date: string) {
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export default function SalonClosures() {
  const { authFetch } = useAuth()
  const [items, setItems] = useState<DayOff[] | null>(null)
  const [stylists, setStylists] = useState<StaffOption[]>([])
  const [error, setError] = useState(false)

  const [date, setDate] = useState('')
  const [scope, setScope] = useState<string>(SALON_SCOPE) // 'salon' | staffId
  const [reason, setReason] = useState('')
  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(false)
    try {
      const [offRes, staffRes] = await Promise.all([
        authFetch('/api/day-offs'),
        authFetch('/api/staff?active=true'),
      ])
      if (!offRes.ok) throw new Error()
      setItems(await offRes.json())
      if (staffRes.ok) {
        const staff = await staffRes.json()
        setStylists(
          (Array.isArray(staff) ? staff : [])
            .filter((s: { role: string }) => s.role === 'stylist')
            .map((s: { id: string; name: string }) => ({ id: s.id, name: s.name }))
        )
      }
    } catch {
      setError(true)
      toast.error('Failed to load closures')
    }
  }, [authFetch])

  useEffect(() => {
    load()
  }, [load])

  const handleAdd = async () => {
    if (!date) {
      toast.error('Pick a date')
      return
    }
    setAdding(true)
    try {
      const res = await authFetch('/api/day-offs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          reason: reason.trim(),
          staffId: scope === SALON_SCOPE ? null : scope,
        }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(body?.error || 'Failed to add closure')
        return
      }
      toast.success('Closure added')
      setDate('')
      setReason('')
      setScope(SALON_SCOPE)
      load()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (id: string) => {
    setRemovingId(id)
    try {
      const res = await authFetch(`/api/day-offs?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error('Failed to remove')
        return
      }
      setItems((prev) => (prev ? prev.filter((i) => i.id !== id) : prev))
    } catch {
      toast.error('Something went wrong')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Closures &amp; days off</CardTitle>
        <CardDescription>
          Block online booking for the whole salon (e.g. a public holiday) or for one stylist on a given day.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Add form */}
        <div className="grid gap-3 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="closure-date">Date</Label>
            <Input
              id="closure-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full sm:w-44"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Applies to</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SALON_SCOPE}>Whole salon</SelectItem>
                {stylists.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="closure-reason">Reason (optional)</Label>
            <Input
              id="closure-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Liberation Day"
              maxLength={120}
            />
          </div>
          <Button onClick={handleAdd} disabled={adding}>
            {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Add
          </Button>
        </div>

        {/* List */}
        {items === null && !error ? (
          <div className="space-y-2">
            <Skeleton className="h-10 rounded-md" />
            <Skeleton className="h-10 rounded-md" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-between rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            <span>Couldn&apos;t load closures.</span>
            <Button variant="outline" size="sm" onClick={load}>
              Try again
            </Button>
          </div>
        ) : items && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 rounded-md border border-dashed py-8 text-center text-muted-foreground">
            <CalendarOff className="size-6 opacity-40" />
            <p className="text-sm">No closures scheduled.</p>
          </div>
        ) : (
          <ul className="divide-y rounded-md border">
            {items?.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{formatDate(item.date)}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.staffName ?? 'Whole salon'}
                    {item.reason ? ` · ${item.reason}` : ''}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemove(item.id)}
                  disabled={removingId === item.id}
                  aria-label="Remove closure"
                >
                  {removingId === item.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
