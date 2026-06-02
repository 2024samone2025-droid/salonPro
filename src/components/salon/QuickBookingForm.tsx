'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Search, Zap } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/auth-context'

interface Customer {
  id: string
  name: string
  phone: string
}

interface Staff {
  id: string
  name: string
  role: string
  active: boolean
}

interface Service {
  id: string
  name: string
  price: number
  duration: number
}

interface QuickBookingFormProps {
  selectedDate: string
  onBookingCreated?: () => void
}

export default function QuickBookingForm({ selectedDate, onBookingCreated }: QuickBookingFormProps) {
  const { permissions, user } = useAuth()
  const canCreate = permissions?.canCreateAppointment ?? false

  const [customers, setCustomers] = useState<Customer[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [services, setServices] = useState<Service[]>([])

  const [searchQuery, setSearchQuery] = useState('')
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')

  const [customerId, setCustomerId] = useState('')
  const [staffId, setStaffId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/customers').then((r) => r.ok ? r.json() : []),
      fetch('/api/staff?active=true').then((r) => r.ok ? r.json() : []),
      fetch('/api/services?active=true').then((r) => r.ok ? r.json() : []),
    ]).then(([c, s, sv]) => {
      setCustomers(Array.isArray(c) ? c : [])
      setStaff(Array.isArray(s) ? s : [])
      setServices(Array.isArray(sv) ? sv : [])
    })
  }, [])

  useEffect(() => {
    if (searchQuery.length > 0) {
      const q = searchQuery.toLowerCase()
      setFilteredCustomers(
        customers.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q))
      )
    } else {
      setFilteredCustomers([])
    }
  }, [searchQuery, customers])

  const selectedService = services.find((s) => s.id === serviceId)

  const getEndTime = useCallback(() => {
    if (!selectedService || !startTime) return ''
    const [h, m] = startTime.split(':').map(Number)
    const totalMin = h * 60 + m + selectedService.duration
    const eh = Math.floor(totalMin / 60)
    const em = totalMin % 60
    return `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`
  }, [selectedService, startTime])

  const handleSubmit = async () => {
    if (!customerId && !showNewCustomer) {
      toast({ title: 'Error', description: 'Please select a customer', variant: 'destructive' })
      return
    }
    if (!staffId) {
      toast({ title: 'Error', description: 'Please select a stylist', variant: 'destructive' })
      return
    }
    if (!serviceId) {
      toast({ title: 'Error', description: 'Please select a service', variant: 'destructive' })
      return
    }

    setSubmitting(true)

    try {
      let cId = customerId

      // Create new customer if needed
      if (showNewCustomer && newCustomerName) {
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newCustomerName, phone: newCustomerPhone }),
        })
        const newCust = await res.json()
        cId = newCust.id
      }

      const endTime = getEndTime()

      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          startTime,
          endTime,
          customerId: cId,
          staffId,
          serviceId,
          status: 'booked',
        }),
      })

      if (res.ok) {
        toast({ title: 'Success', description: 'Appointment booked!' })
        setCustomerId('')
        setStaffId('')
        setServiceId('')
        setStartTime('09:00')
        setSearchQuery('')
        setShowNewCustomer(false)
        setNewCustomerName('')
        setNewCustomerPhone('')
        onBookingCreated?.()
      } else {
        toast({ title: 'Error', description: 'Failed to book appointment', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  // Stylists shouldn't see the quick booking form
  if (!canCreate) return null

  return (
    <Card className="border-emerald-200 bg-emerald-50/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="size-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-emerald-900">Quick Booking</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Customer Search */}
          <div className="lg:col-span-2 relative">
            <Label className="text-xs text-muted-foreground">Customer</Label>
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search name or phone..."
                value={customerId ? customers.find((c) => c.id === customerId)?.name || searchQuery : searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCustomerId('')
                }}
                className="pl-8 h-9 text-sm"
              />
            </div>
            {filteredCustomers.length > 0 && !customerId && (
              <div className="absolute z-20 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-40 overflow-y-auto">
                {filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                    onClick={() => {
                      setCustomerId(c.id)
                      setSearchQuery('')
                      setFilteredCustomers([])
                    }}
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted-foreground ml-2">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
            {!customerId && (
              <button
                className="text-xs text-emerald-700 hover:text-emerald-800 mt-1 flex items-center gap-1"
                onClick={() => setShowNewCustomer(!showNewCustomer)}
              >
                <Plus className="size-3" />
                New customer
              </button>
            )}
            {showNewCustomer && (
              <div className="mt-2 space-y-2 p-2 border rounded-md bg-background">
                <Input
                  placeholder="Name"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="h-8 text-sm"
                />
                <Input
                  placeholder="Phone"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            )}
          </div>

          {/* Service */}
          <div>
            <Label className="text-xs text-muted-foreground">Service</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger className="h-9 text-sm mt-1 w-full">
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({new Intl.NumberFormat('en-RW').format(s.price)} RWF)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Staff */}
          <div>
            <Label className="text-xs text-muted-foreground">Stylist</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger className="h-9 text-sm mt-1 w-full">
                <SelectValue placeholder="Select stylist" />
              </SelectTrigger>
              <SelectContent>
                {staff
                  .filter((s) => s.role === 'stylist')
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time */}
          <div>
            <Label className="text-xs text-muted-foreground">Time</Label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="h-9 text-sm mt-1"
            />
          </div>

          {/* Submit */}
          <div className="flex items-end">
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting ? 'Booking...' : 'Book Now'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
