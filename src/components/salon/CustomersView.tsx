'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Plus, Phone, CalendarDays, LayoutGrid, List } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { useAuth } from '@/lib/auth-context'

interface CustomerAppointment {
  id: string
  status: string
  date: string
  startTime: string
  endTime: string
  service: { name: string; price: number }
  staff: { name: string }
}

interface Customer {
  id: string
  name: string
  phone: string
  notes: string
  appointments: CustomerAppointment[]
}

const statusLabels: Record<string, string> = {
  booked: 'Booked',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  no_show: 'No Show',
}

const statusColors: Record<string, string> = {
  booked: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-emerald-100 text-emerald-800',
  in_progress: 'bg-amber-100 text-amber-800',
  completed: 'bg-green-100 text-green-800',
  no_show: 'bg-red-100 text-red-800',
}

function formatRWF(amount: number) {
  return new Intl.NumberFormat('en-RW').format(amount) + ' RWF'
}

export default function CustomersView() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const { permissions, authFetch } = useAuth()
  const canEdit = permissions?.customers === 'full'
  const isViewOnly = permissions?.customers === 'view'

  // Add form
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newNotes, setNewNotes] = useState('')

  // Edit form
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editNotes, setEditNotes] = useState('')

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const url = searchQuery ? `/api/customers?q=${encodeURIComponent(searchQuery)}` : '/api/customers'
      const res = await authFetch(url)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setCustomers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, authFetch])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const handleAddCustomer = async () => {
    if (!newName || !newPhone) {
      toast({ title: 'Error', description: 'Name and phone are required', variant: 'destructive' })
      return
    }
    try {
      const res = await authFetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, phone: newPhone, notes: newNotes }),
      })
      if (res.ok) {
        toast({ title: 'Customer Added', description: `${newName} has been added` })
        setNewName('')
        setNewPhone('')
        setNewNotes('')
        setShowAddDialog(false)
        fetchCustomers()
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to add customer', variant: 'destructive' })
    }
  }

  const handleUpdateCustomer = async () => {
    if (!selectedCustomer) return
    try {
      const res = await authFetch('/api/customers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedCustomer.id,
          name: editName,
          phone: editPhone,
          notes: editNotes,
        }),
      })
      if (res.ok) {
        toast({ title: 'Customer Updated' })
        fetchCustomers()
        setShowDetailDialog(false)
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update customer', variant: 'destructive' })
    }
  }

  const openDetail = (customer: Customer) => {
    setSelectedCustomer(customer)
    setEditName(customer.name)
    setEditPhone(customer.phone)
    setEditNotes(customer.notes)
    setShowDetailDialog(true)
  }

  const getLastVisit = (customer: Customer): string | null => {
    if (!customer.appointments || customer.appointments.length === 0) return null
    const sorted = [...customer.appointments].sort((a, b) => b.date.localeCompare(a.date))
    return sorted[0].date
  }

  const getTotalSpent = (customer: Customer): number => {
    return customer.appointments
      .filter((a) => a.status === 'completed')
      .reduce((sum, a) => sum + a.service.price, 0)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-2xl font-bold">Customers</h2>
          <p className="text-muted-foreground text-sm">{customers.length} customers</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full sm:w-64"
            />
          </div>
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              className={viewMode === 'grid' ? 'bg-emerald-600 hover:bg-emerald-700 h-9 w-9' : 'h-9 w-9'}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              className={viewMode === 'list' ? 'bg-emerald-600 hover:bg-emerald-700 h-9 w-9' : 'h-9 w-9'}
              onClick={() => setViewMode('list')}
            >
              <List className="size-4" />
            </Button>
          </div>
          {canEdit && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="size-4 mr-1" />
              Add
            </Button>
          )}
        </div>
      </div>

      {/* Customer List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No customers found.</p>
            {canEdit && (
              <Button
                className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="size-4 mr-1" /> Add Customer
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {customers.map((customer) => {
            const lastVisit = getLastVisit(customer)
            const totalSpent = getTotalSpent(customer)
            return (
              <Card
                key={customer.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => openDetail(customer)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="size-3" />
                        {customer.phone}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      <CalendarDays className="size-3 mr-1" />
                      {customer.appointments?.length || 0} visits
                    </Badge>
                  </div>
                  {lastVisit && (
                    <div className="mt-2 pt-2 border-t flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Last visit: {format(new Date(lastVisit), 'MMM d, yyyy')}
                      </p>
                      {totalSpent > 0 && (
                        <p className="text-xs font-medium text-emerald-700">
                          {formatRWF(totalSpent)}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        /* List view */
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {customers.map((customer) => {
                const lastVisit = getLastVisit(customer)
                const totalSpent = getTotalSpent(customer)
                return (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between p-4 hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => openDetail(customer)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center size-9 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{customer.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {lastVisit && (
                        <span>{format(new Date(lastVisit), 'MMM d')}</span>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {customer.appointments?.length || 0} visits
                      </Badge>
                      {totalSpent > 0 && (
                        <span className="font-medium text-emerald-700">{formatRWF(totalSpent)}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Customer Dialog */}
      {canEdit && (
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Customer name"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+250788XXXXXX"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Any notes about this customer..."
                className="mt-1"
                rows={2}
              />
            </div>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleAddCustomer}
            >
              Add Customer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      )}

      {/* Customer Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              {/* Editable fields */}
              <div className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={editName}
                    onChange={(e) => canEdit && setEditName(e.target.value)}
                    className="mt-1"
                    readOnly={!canEdit}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={editPhone}
                    onChange={(e) => canEdit && setEditPhone(e.target.value)}
                    className="mt-1"
                    readOnly={!canEdit}
                  />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => canEdit && setEditNotes(e.target.value)}
                    className="mt-1"
                    rows={2}
                    readOnly={!canEdit}
                  />
                </div>
                {canEdit && (
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleUpdateCustomer}
                  >
                    Save Changes
                  </Button>
                )}
                {isViewOnly && (
                  <p className="text-xs text-muted-foreground text-center">Read-only access — contact admin to make changes</p>
                )}
              </div>

              {/* Visit History */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Visit History</h4>
                {selectedCustomer.appointments?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No visits yet.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedCustomer.appointments?.map((apt) => (
                      <div
                        key={apt.id}
                        className="flex items-center justify-between p-2.5 rounded-md border text-sm"
                      >
                        <div>
                          <p className="font-medium text-xs">{apt.service?.name || 'Service'}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(apt.date), 'MMM d, yyyy')} • {apt.startTime} - {apt.endTime}
                          </p>
                          {apt.staff?.name && (
                            <p className="text-xs text-muted-foreground">
                              Stylist: {apt.staff.name}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className={`${statusColors[apt.status] || ''} border-0 text-xs`}>
                            {statusLabels[apt.status] || apt.status}
                          </Badge>
                          {apt.service?.price > 0 && (
                            <span className="text-xs font-medium text-emerald-700">
                              {formatRWF(apt.service.price)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
