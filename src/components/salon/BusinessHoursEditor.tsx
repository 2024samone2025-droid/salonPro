'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useIsMobile } from '@/hooks/use-mobile'
import { ChevronRight, CopyPlus } from 'lucide-react'
import { toast } from 'sonner'
import { DAY_LABELS, type BusinessHours } from '@/lib/salon-settings'

// 'HH:mm' (24h) -> '9:00 AM', for the at-a-glance day list.
function formatTime(value: string): string {
  const [h, m] = value.split(':').map(Number)
  const period = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

// Add minutes to an 'HH:mm' value, clamped to 23:59 (the API caps there).
function addMinutes(value: string, delta: number): string {
  const [h, m] = value.split(':').map(Number)
  const total = Math.min(h * 60 + m + delta, 23 * 60 + 59)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

interface BusinessHoursEditorProps {
  value: BusinessHours
  slotIntervalMinutes: number
  onChange: (next: BusinessHours) => void
}

export default function BusinessHoursEditor({
  value,
  slotIntervalMinutes,
  onChange,
}: BusinessHoursEditorProps) {
  const isMobile = useIsMobile()
  const [editingDay, setEditingDay] = useState<number | null>(null)
  const editing = editingDay !== null ? value[String(editingDay)] : null

  const patchDay = (patch: Partial<BusinessHours[string]>) => {
    if (editingDay === null) return
    onChange({ ...value, [String(editingDay)]: { ...value[String(editingDay)], ...patch } })
  }

  const handleOpen = (open: string) => {
    // Keep close strictly after open (the API rejects open >= close).
    const close =
      editing && open >= editing.close ? addMinutes(open, slotIntervalMinutes) : editing?.close ?? open
    patchDay({ open, close })
  }

  const handleClose = (close: string) => {
    if (editing && close <= editing.open) return
    patchDay({ close })
  }

  const applyToAll = () => {
    if (!editing) return
    const next: BusinessHours = { ...value }
    for (let i = 0; i <= 6; i++) {
      next[String(i)] = { ...next[String(i)], open: editing.open, close: editing.close }
    }
    onChange(next)
    toast.success('Hours applied to every day')
  }

  // Native picker steps in line with the salon's booking interval.
  const step = slotIntervalMinutes * 60

  const list = (
    <div className="divide-y divide-border overflow-hidden rounded-lg border">
      {DAY_LABELS.map((label, day) => {
        const hours = value[String(day)]
        return (
          <button
            key={label}
            type="button"
            onClick={() => setEditingDay(day)}
            className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors hover:bg-muted/50"
          >
            <span className="text-sm font-medium">{label}</span>
            <span className="flex items-center gap-2 text-sm">
              {hours.closed ? (
                <span className="text-muted-foreground">Closed</span>
              ) : (
                <span>
                  {formatTime(hours.open)} – {formatTime(hours.close)}
                </span>
              )}
              <ChevronRight className="size-4 text-muted-foreground" />
            </span>
          </button>
        )
      })}
    </div>
  )

  const inner = editingDay !== null && editing && (
    <>
      <DialogHeader>
        <DialogTitle>{DAY_LABELS[editingDay]}</DialogTitle>
        <DialogDescription>Set whether you&apos;re open and your hours.</DialogDescription>
      </DialogHeader>

      <div className="space-y-5 py-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="day-open">Open this day</Label>
          <Switch
            id="day-open"
            checked={!editing.closed}
            onCheckedChange={(open) => patchDay({ closed: !open })}
          />
        </div>

        {!editing.closed && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="opens-at">Opens</Label>
                <Input
                  id="opens-at"
                  type="time"
                  step={step}
                  max={editing.close}
                  value={editing.open}
                  onChange={(e) => e.target.value && handleOpen(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="closes-at">Closes</Label>
                <Input
                  id="closes-at"
                  type="time"
                  step={step}
                  min={editing.open}
                  value={editing.close}
                  onChange={(e) => e.target.value && handleClose(e.target.value)}
                />
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={applyToAll}
            >
              <CopyPlus className="size-4" />
              Apply these hours to every day
            </Button>
          </>
        )}
      </div>

      <DialogFooter>
        <Button type="button" className="w-full sm:w-auto" onClick={() => setEditingDay(null)}>
          Done
        </Button>
      </DialogFooter>
    </>
  )

  return (
    <>
      {list}
      {isMobile ? (
        <Sheet open={editingDay !== null} onOpenChange={(o) => !o && setEditingDay(null)}>
          <SheetContent
            side="bottom"
            className="rounded-t-xl p-6 pb-[max(env(safe-area-inset-bottom),1.5rem)]"
          >
            {inner}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={editingDay !== null} onOpenChange={(o) => !o && setEditingDay(null)}>
          <DialogContent className="sm:max-w-md">{inner}</DialogContent>
        </Dialog>
      )}
    </>
  )
}
