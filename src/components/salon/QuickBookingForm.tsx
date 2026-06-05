'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Plus, Search, Zap, Loader2, X, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
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

function formatRWF(amount: number) {
  return new Intl.NumberFormat('en-RW').format(amount) + ' RWF'
}

export default function QuickBookingForm({ selectedDate, onBookingCreated }: QuickBookingFormProps) {
  const { permissions, user, authFetch } = useAuth()
  const canCreate = permissions?.canCreateAppointment ?? false

  const [customers, setCustomers] = useState<Customer[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [services, setServices] = useState<Service[]>([])

  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')

  const [customerId, setCustomerId] = useState('')
  const [staffId, setStaffId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [submitting, setSubmitting] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([
      authFetch('/api/customers').then((r) => (r.ok ? r.json() : [])),
      authFetch('/api/staff?active=true').then((r) => (r.ok ? r.json() : [])),
      authFetch('/api/services?active=true').then((r) => (r.ok ? r.json() : [])),
    ]).then(([c, s, sv]) => {
      setCustomers(Array.isArray(c) ? c : [])
      setStaff(Array.isArray(s) ? s : [])
      setServices(Array.isArray(sv) ? sv : [])
    })
  }, [authFetch])

  const filteredCustomers = useMemo(() => {
    if (searchQuery.length === 0) return []
    const q = searchQuery.toLowerCase()
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    )
  }, [searchQuery, customers])

  useEffect(() => {
    setShowDropdown(searchQuery.length > 0)
  }, [searchQuery.length])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedService = services.find((s) => s.id === serviceId)
  const selectedCustomer = customers.find((c) => c.id === customerId)

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
      toast.error('Please select a customer')
      return
    }
    if (showNewCustomer && !newCustomerName.trim()) {
      toast.error('Please enter the customer name')
      return
    }
    if (!staffId) {
      toast.error('Please select a stylist')
      return
    }
    if (!serviceId) {
      toast.error('Please select a service')
      return
    }

    setSubmitting(true)

    try {
      let cId = customerId

      // Create new customer if needed
      if (showNewCustomer && newCustomerName) {
        const res = await authFetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newCustomerName, phone: newCustomerPhone }),
        })
        if (!res.ok) {
          toast.error('Failed to create customer')
          setSubmitting(false)
          return
        }
        const newCust = await res.json()
        cId = newCust.id
      }

      const endTime = getEndTime()

      const res = await authFetch('/api/appointments', {
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
        toast.success('Appointment booked successfully!')
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
        toast.error('Failed to book appointment')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  // Stylists shouldn't see the quick booking form
  if (!canCreate) return null

  return (
    <Card className="border-primary/20 bg-primary/[0.03] shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
            <Zap className="size-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm">Quick Booking</CardTitle>
            <CardDescription className="text-xs">Create a new appointment in seconds</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* Customer Search */}
          <div className="lg:col-span-2 xl:col-span-2 relative" ref={dropdownRef}>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Customer</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search name or phone..."
                value={
                  customerId
                    ? selectedCustomer?.name || searchQuery
                    : searchQuery
                }
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCustomerId('')
                }}
                onFocus={() => {
                  if (searchQuery.length > 0) setShowDropdown(true)
                }}
                className="pl-8 h-9 text-sm pr-8"
              />
              {customerId && (
                <button
                  className="absolute right-2 top-2"
                  onClick={() => {
                    setCustomerId('')
                    setSearchQuery('')
                    searchInputRef.current?.focus()
                  }}
                >
                  <X className="size-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                </button>
              )}
            </div>
            {/* Autocomplete dropdown */}
            {showDropdown && filteredCustomers.length > 0 && !customerId && (
              <div className="absolute z-30 mt-1 w-full bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between"
                    onClick={() => {
                      setCustomerId(c.id)
                      setSearchQuery('')
                      setShowDropdown(false)
                    }}
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
            {/* No results */}
            {showDropdown && searchQuery.length > 0 && filteredCustomers.length === 0 && !customerId && (
              <div className="absolute z-30 mt-1 w-full bg-popover border rounded-lg shadow-lg p-3">
                <p className="text-xs text-muted-foreground">No customers found.</p>
              </div>
            )}
            {!customerId && (
              <button
                className="text-xs text-primary hover:text-primary/80 mt-1.5 flex items-center gap-1 font-medium"
                onClick={() => {
                  setShowNewCustomer(!showNewCustomer)
                  setShowDropdown(false)
                }}
              >
                {showNewCustomer ? (
                  <>
                    <X className="size-3" />
                    Cancel
                  </>
                ) : (
                  <>
                    <UserPlus className="size-3" />
                    New customer
                  </>
                )}
              </button>
            )}
            {showNewCustomer && (
              <div className="mt-2 space-y-2 p-3 border rounded-lg bg-background">
                <Input
                  placeholder="Customer name"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="h-8 text-sm"
                />
                <Input
                  placeholder="Phone number"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            )}
          </div>

          {/* Service */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Service</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger className="h-9 text-sm w-full">
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({formatRWF(s.price)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedService && (
              <p className="text-[11px] text-muted-foreground mt-1">
                {selectedService.duration} min
              </p>
            )}
          </div>

          {/* Staff */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Stylist</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger className="h-9 text-sm w-full">
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
            <Label className="text-xs text-muted-foreground mb-1.5 block">Time</Label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="h-9 text-sm"
            />
            {selectedService && startTime && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Until {getEndTime()}
              </p>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-end">
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full h-10 sm:h-9 shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  <Plus className="size-3.5" />
                  Book Now
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
