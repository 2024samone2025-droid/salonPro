'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  User,
  Scissors,
  Clock,
  CalendarDays,
  CreditCard,
  MessageSquare,
  Trash2,
  Loader2,
  ArrowRight,
  Phone,
  Banknote,
  Smartphone,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'

interface Appointment {
  id: string
  date: string
  startTime: string
  endTime: string
  status: string
  notes: string
  customer: { id: string; name: string; phone: string }
  staff: { id: string; name: string }
  service: { id: string; name: string; price: number; duration: number }
  payment?: {
    id: string
    status: string
    method: string
    amount: number
  } | null
}

interface AppointmentDialogProps {
  appointment: Appointment | null
  open: boolean
  onClose: () => void
  onUpdate?: () => void
}

function formatRWF(amount: number) {
  return new Intl.NumberFormat('en-RW').format(amount) + ' RWF'
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const statusColors: Record<string, string> = {
  booked: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-emerald-100 text-emerald-800',
  in_progress: 'bg-amber-100 text-amber-800',
  completed: 'bg-green-100 text-green-800',
  no_show: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  booked: 'Booked',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  no_show: 'No Show',
}

const statusFlow: Record<string, string[]> = {
  booked: ['confirmed', 'no_show'],
  confirmed: ['in_progress', 'no_show'],
  in_progress: ['completed'],
}

const methodLabels: Record<string, string> = {
  cash: 'Cash',
  mtn_momo: 'MTN MoMo',
  airtel_money: 'Airtel Money',
}

const methodIcons: Record<string, React.ReactNode> = {
  cash: <Banknote className="size-3.5" />,
  mtn_momo: <Smartphone className="size-3.5" />,
  airtel_money: <Smartphone className="size-3.5" />,
}

const paymentStatusColors: Record<string, string> = {
  unpaid: 'bg-red-100 text-red-800',
  partial: 'bg-amber-100 text-amber-800',
  paid: 'bg-green-100 text-green-800',
}

const paymentStatusLabels: Record<string, string> = {
  unpaid: 'Unpaid',
  partial: 'Partial',
  paid: 'Paid',
}

export default function AppointmentDialog({ appointment, open, onClose, onUpdate }: AppointmentDialogProps) {
  const [paymentStatus, setPaymentStatus] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [updating, setUpdating] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)

  const { permissions, authFetch } = useAuth()
  const canUpdateStatus = permissions?.canUpdateAppointmentStatus ?? false
  const canManagePayments = permissions?.canManagePayments ?? false
  const canDelete = permissions?.canDeleteRecords ?? false

  useEffect(() => {
    if (appointment) {
      setPaymentStatus(appointment.payment?.status || 'unpaid')
      setPaymentMethod(appointment.payment?.method || 'cash')
      setPaymentAmount(
        appointment.payment?.amount?.toString() || appointment.service.price.toString()
      )
      setNotes(appointment.notes || '')
    }
  }, [appointment])

  if (!appointment) return null

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true)
    try {
      const res = await authFetch('/api/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: appointment.id, status: newStatus }),
      })
      if (res.ok) {
        toast.success(`Appointment marked as ${statusLabels[newStatus]}`)
        onUpdate?.()
      } else {
        toast.error('Failed to update status')
      }
    } catch {
      toast.error('Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const handlePaymentUpdate = async () => {
    setUpdating(true)
    try {
      if (!appointment.payment?.id) {
        const res = await authFetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointmentId: appointment.id,
            status: paymentStatus,
            method: paymentMethod,
            amount: parseFloat(paymentAmount) || appointment.service.price,
          }),
        })
        if (res.ok) {
          toast.success('Payment recorded successfully')
          onUpdate?.()
        } else {
          toast.error('Failed to record payment')
        }
      } else {
        const res = await authFetch('/api/payments', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: appointment.payment.id,
            status: paymentStatus,
            method: paymentMethod,
            amount: parseFloat(paymentAmount) || appointment.service.price,
          }),
        })
        if (res.ok) {
          toast.success('Payment updated successfully')
          onUpdate?.()
        } else {
          toast.error('Failed to update payment')
        }
      }
    } catch {
      toast.error('Failed to update payment')
    } finally {
      setUpdating(false)
    }
  }

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    try {
      const res = await authFetch('/api/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: appointment.id, notes }),
      })
      if (res.ok) {
        toast.success('Notes saved')
        onUpdate?.()
      } else {
        toast.error('Failed to save notes')
      }
    } catch {
      toast.error('Failed to save notes')
    } finally {
      setSavingNotes(false)
    }
  }

  const handleDelete = async () => {
    setUpdating(true)
    try {
      const res = await authFetch(`/api/appointments?id=${appointment.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Appointment cancelled')
        onClose()
        onUpdate?.()
      } else {
        toast.error('Failed to cancel appointment')
      }
    } catch {
      toast.error('Failed to cancel appointment')
    } finally {
      setUpdating(false)
    }
  }

  const nextStatuses = statusFlow[appointment.status] || []

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Appointment Details
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 pt-1">
            <Badge className={`${statusColors[appointment.status]} border-0 text-xs`}>
              {statusLabels[appointment.status]}
            </Badge>
            <span>{appointment.service.name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Customer & Stylist Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Avatar className="size-9 border shrink-0">
                <AvatarFallback className="bg-emerald-50 text-emerald-700 text-xs font-semibold">
                  {getInitials(appointment.customer.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="size-3" /> Customer
                </p>
                <p className="font-medium text-sm truncate">{appointment.customer.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="size-3" /> {appointment.customer.phone}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Avatar className="size-9 border shrink-0">
                <AvatarFallback className="bg-teal-50 text-teal-700 text-xs font-semibold">
                  {getInitials(appointment.staff.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Scissors className="size-3" /> Stylist
                </p>
                <p className="font-medium text-sm truncate">{appointment.staff.name}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Service & Time Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <Scissors className="size-3" /> Service
              </p>
              <p className="font-medium text-sm">{appointment.service.name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="size-3" /> {appointment.service.duration} min
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <CalendarDays className="size-3" /> Date & Time
              </p>
              <p className="font-medium text-sm">{appointment.date}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {appointment.startTime} - {appointment.endTime}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3">
            <span className="text-sm text-emerald-800 font-medium">Service Price</span>
            <span className="text-lg font-bold text-emerald-700">{formatRWF(appointment.service.price)}</span>
          </div>

          {/* Status Change Buttons */}
          {canUpdateStatus && nextStatuses.length > 0 && (
            <>
              <Separator />
              <div>
                <Label className="text-sm font-medium mb-2 block">Update Status</Label>
                <div className="flex gap-2">
                  {nextStatuses.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={s === 'no_show' ? 'destructive' : 'default'}
                      className={s !== 'no_show' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                      onClick={() => handleStatusChange(s)}
                      disabled={updating}
                    >
                      {updating ? (
                        <Loader2 className="size-4 mr-1.5 animate-spin" />
                      ) : (
                        <ArrowRight className="size-4 mr-1.5" />
                      )}
                      {statusLabels[s]}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Payment Section - Admin/Receptionist */}
          {canManagePayments && (
            <>
              <Separator />
              <div>
                <Label className="text-sm font-medium mb-3 flex items-center gap-1.5">
                  <CreditCard className="size-4" /> Payment
                </Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">
                          <span className="flex items-center gap-1.5">
                            <Banknote className="size-3.5" /> Cash
                          </span>
                        </SelectItem>
                        <SelectItem value="mtn_momo">
                          <span className="flex items-center gap-1.5">
                            <Smartphone className="size-3.5" /> MTN MoMo
                          </span>
                        </SelectItem>
                        <SelectItem value="airtel_money">
                          <span className="flex items-center gap-1.5">
                            <Smartphone className="size-3.5" /> Airtel Money
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Amount (RWF)</Label>
                    <Input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="h-9 text-sm"
                      placeholder={appointment.service.price.toString()}
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handlePaymentUpdate}
                  disabled={updating}
                >
                  {updating && <Loader2 className="size-4 mr-1.5 animate-spin" />}
                  Save Payment
                </Button>
              </div>
            </>
          )}

          {/* Payment Info - Stylist (read-only) */}
          {!canManagePayments && appointment.payment && (
            <>
              <Separator />
              <div>
                <Label className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <CreditCard className="size-4" /> Payment Info
                </Label>
                <div className="flex items-center gap-3 mt-2 p-3 rounded-lg bg-muted/50">
                  <Badge className={`${paymentStatusColors[appointment.payment.status] || 'bg-gray-100 text-gray-800'} border-0 text-xs`}>
                    {paymentStatusLabels[appointment.payment.status] || appointment.payment.status}
                  </Badge>
                  {appointment.payment.status !== 'unpaid' && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className="font-medium">{formatRWF(appointment.payment.amount)}</span>
                      <span className="text-muted-foreground">via</span>
                      <span className="flex items-center gap-1">
                        {methodIcons[appointment.payment.method]}
                        {methodLabels[appointment.payment.method]}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Payment Info - No payment record, stylist view */}
          {!canManagePayments && !appointment.payment && (
            <>
              <Separator />
              <div>
                <Label className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <CreditCard className="size-4" /> Payment Info
                </Label>
                <div className="mt-2 p-3 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">No payment recorded yet</p>
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          <Separator />
          <div>
            <Label className="text-sm font-medium mb-2 flex items-center gap-1.5">
              <MessageSquare className="size-4" /> Notes
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2 text-sm"
              rows={3}
              placeholder="Add notes about this appointment..."
            />
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={handleSaveNotes}
              disabled={savingNotes}
            >
              {savingNotes ? (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              ) : null}
              Save Notes
            </Button>
          </div>

          {/* Cancel/Delete - Admin only */}
          {canDelete && appointment.status !== 'completed' && (
            <>
              <Separator />
              <DialogFooter className="sm:justify-start">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={updating}
                >
                  {updating ? (
                    <Loader2 className="size-4 mr-1.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-4 mr-1.5" />
                  )}
                  Cancel Appointment
                </Button>
              </DialogFooter>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
