'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
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
import { toast } from '@/hooks/use-toast'
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

export default function AppointmentDialog({ appointment, open, onClose, onUpdate }: AppointmentDialogProps) {
  const [paymentStatus, setPaymentStatus] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [updating, setUpdating] = useState(false)

  const { permissions } = useAuth()
  const canUpdateStatus = permissions?.canUpdateAppointmentStatus ?? false
  const canManagePayments = permissions?.canManagePayments ?? false
  const canDelete = permissions?.canDeleteRecords ?? false

  useEffect(() => {
    if (appointment) {
      setPaymentStatus(appointment.payment?.status || 'unpaid')
      setPaymentMethod(appointment.payment?.method || 'cash')
      setPaymentAmount(
        appointment.payment?.amount?.toString() || '0'
      )
      setNotes(appointment.notes || '')
    }
  }, [appointment])

  if (!appointment) return null

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true)
    try {
      const res = await fetch('/api/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: appointment.id, status: newStatus }),
      })
      if (res.ok) {
        toast({ title: 'Status Updated', description: `Appointment marked as ${statusLabels[newStatus]}` })
        onUpdate?.()
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' })
    } finally {
      setUpdating(false)
    }
  }

  const handlePaymentUpdate = async () => {
    if (!appointment.payment?.id) {
      try {
        const res = await fetch('/api/payments', {
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
          toast({ title: 'Payment Created', description: 'Payment has been recorded' })
          onUpdate?.()
        }
      } catch {
        toast({ title: 'Error', description: 'Failed to create payment', variant: 'destructive' })
      }
    } else {
      try {
        const res = await fetch('/api/payments', {
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
          toast({ title: 'Payment Updated', description: 'Payment has been updated' })
          onUpdate?.()
        }
      } catch {
        toast({ title: 'Error', description: 'Failed to update payment', variant: 'destructive' })
      }
    }
  }

  const handleDelete = async () => {
    setUpdating(true)
    try {
      const res = await fetch(`/api/appointments?id=${appointment.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Cancelled', description: 'Appointment has been cancelled' })
        onClose()
        onUpdate?.()
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to cancel appointment', variant: 'destructive' })
    } finally {
      setUpdating(false)
    }
  }

  const nextStatuses = statusFlow[appointment.status] || []

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Appointment Details
            <Badge className={`${statusColors[appointment.status]} border-0`}>
              {statusLabels[appointment.status]}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Customer</p>
              <p className="font-medium">{appointment.customer.name}</p>
              <p className="text-xs text-muted-foreground">{appointment.customer.phone}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Stylist</p>
              <p className="font-medium">{appointment.staff.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Service</p>
              <p className="font-medium">{appointment.service.name}</p>
              <p className="text-xs text-muted-foreground">
                {appointment.service.duration} min • {formatRWF(appointment.service.price)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Date & Time</p>
              <p className="font-medium">{appointment.date}</p>
              <p className="text-xs text-muted-foreground">
                {appointment.startTime} - {appointment.endTime}
              </p>
            </div>
          </div>

          {/* Status change buttons - only if user has permission */}
          {canUpdateStatus && nextStatuses.length > 0 && (
            <>
              <Separator />
              <div>
                <Label className="text-sm font-medium">Change Status</Label>
                <div className="flex gap-2 mt-2">
                  {nextStatuses.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={s === 'no_show' ? 'destructive' : 'default'}
                      className={s !== 'no_show' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                      onClick={() => handleStatusChange(s)}
                      disabled={updating}
                    >
                      {statusLabels[s]}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Payment section - only if user has permission */}
          {canManagePayments && (
            <>
              <Separator />
              <div>
                <Label className="text-sm font-medium">Payment</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="mtn_momo">MTN MoMo</SelectItem>
                        <SelectItem value="airtel_money">Airtel Money</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Amount (RWF)</Label>
                    <Input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="h-8 text-xs"
                      placeholder={appointment.service.price.toString()}
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handlePaymentUpdate}
                  disabled={updating}
                >
                  Update Payment
                </Button>
              </div>
            </>
          )}

          {/* Show payment info for stylists (read-only) */}
          {!canManagePayments && appointment.payment && (
            <>
              <Separator />
              <div>
                <Label className="text-sm font-medium">Payment Info</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={`${appointment.payment.status === 'paid' ? 'bg-green-100 text-green-800' : appointment.payment.status === 'partial' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'} border-0`}>
                    {appointment.payment.status === 'paid' ? 'Paid' : appointment.payment.status === 'partial' ? 'Partial' : 'Unpaid'}
                  </Badge>
                  {appointment.payment.status !== 'unpaid' && (
                    <span className="text-sm">{formatRWF(appointment.payment.amount)} via {methodLabels[appointment.payment.method]}</span>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          <Separator />
          <div>
            <Label className="text-sm font-medium">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 text-sm"
              rows={2}
              placeholder="Add notes..."
            />
            <Button
              size="sm"
              variant="outline"
              className="mt-1"
              onClick={async () => {
                await fetch('/api/appointments', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: appointment.id, notes }),
                })
                toast({ title: 'Notes Updated' })
                onUpdate?.()
              }}
            >
              Save Notes
            </Button>
          </div>

          {/* Cancel/Delete - only if user has permission */}
          {canDelete && appointment.status !== 'completed' && (
            <div className="pt-2">
              <Button
                size="sm"
                variant="destructive"
                className="w-full"
                onClick={handleDelete}
                disabled={updating}
              >
                Cancel Appointment
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
