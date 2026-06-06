'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Search,
  Plus,
  Phone,
  CalendarDays,
  LayoutGrid,
  List,
  User,
  Clock,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { useAuth } from '@/lib/auth-context'
import { STATUS_CONFIG, type AppointmentStatus } from '@/lib/constants'

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

function formatRWF(amount: number) {
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
    maximumFractionDigits: 0,
  }).format(amount)
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function CustomersView() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [saving, setSaving] = useState(false)
  const isInitialMount = useRef(true)

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
    if (!isInitialMount.current) {
      setLoading(true)
    }
    isInitialMount.current = false
    try {
      const url = searchQuery ? `/api/customers?q=${encodeURIComponent(searchQuery)}` : '/api/customers'
      const res = await authFetch(url)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setCustomers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load customers')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, authFetch])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const handleAddCustomer = async () => {
    if (!newName.trim()) {
      toast.error('Customer name is required')
      return
    }
    if (!newPhone.trim()) {
      toast.error('Phone number is required')
      return
    }
    setSaving(true)
    try {
      const res = await authFetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), phone: newPhone.trim(), notes: newNotes.trim() }),
      })
      if (res.ok) {
        toast.success(`${newName.trim()} has been added`)
        setNewName('')
        setNewPhone('')
        setNewNotes('')
        setShowAddDialog(false)
        fetchCustomers()
      } else {
        toast.error('Failed to add customer')
      }
    } catch {
      toast.error('Failed to add customer')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateCustomer = async () => {
    if (!selectedCustomer) return
    if (!editName.trim()) {
      toast.error('Customer name is required')
      return
    }
    setSaving(true)
    try {
      const res = await authFetch('/api/customers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedCustomer.id,
          name: editName.trim(),
          phone: editPhone.trim(),
          notes: editNotes.trim(),
        }),
      })
      if (res.ok) {
        toast.success('Customer updated successfully')
        fetchCustomers()
        setShowDetailDialog(false)
      } else {
        toast.error('Failed to update customer')
      }
    } catch {
      toast.error('Failed to update customer')
    } finally {
      setSaving(false)
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Customers</h2>
          <p className="text-muted-foreground text-sm">
            {customers.length} customer{customers.length !== 1 ? 's' : ''} on record
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto items-center">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 w-full sm:w-64 shadow-sm"
            />
          </div>
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => { if (v) setViewMode(v as 'grid' | 'list') }}
            variant="outline"
            className="border rounded-md p-1 bg-muted/50 hidden sm:flex"
          >
            <ToggleGroupItem value="grid" aria-label="Grid view" className="size-8 p-0">
              <LayoutGrid className="size-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view" className="size-8 p-0">
              <List className="size-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          {canEdit && (
            <Button
              className="h-10 gap-2 shadow-sm shrink-0"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="size-4" />
              Add Customer
            </Button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="space-y-4">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                      <Skeleton className="size-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t">
                      <div className="flex justify-between">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 border-b last:border-0">
                    <Skeleton className="size-9 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      ) : customers.length === 0 ? (
        /* Empty State */
        <Card>
          <CardContent className="p-12 text-center">
            <div className="mx-auto size-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
              <User className="size-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No customers found</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {searchQuery ? 'Try adjusting your search terms' : 'Get started by adding your first customer'}
            </p>
            {canEdit && !searchQuery && (
              <Button
                className=""
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="size-4 mr-1.5" /> Add Customer
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((customer) => {
            const lastVisit = getLastVisit(customer)
            const totalSpent = getTotalSpent(customer)
            return (
              <Card
                key={customer.id}
                className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => openDetail(customer)}
              >
                <CardHeader className="pb-3 pt-4 px-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10 border border-primary/10">
                        <AvatarFallback className="bg-primary/5 text-primary text-sm font-semibold">
                          {getInitials(customer.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">{customer.name}</CardTitle>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone className="size-3" />
                          {customer.phone}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      <CalendarDays className="size-3 mr-1" />
                      {customer.appointments?.length || 0}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-4 px-4 pt-0">
                  {(lastVisit || totalSpent > 0) && (
                    <div className="mt-1 pt-3 border-t flex items-center justify-between">
                      {lastVisit ? (
                        <p className="text-xs text-muted-foreground">
                          Last visit: {format(new Date(lastVisit), 'MMM d, yyyy')}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">No visits yet</p>
                      )}
                      {totalSpent > 0 && (
                        <p className="text-xs font-semibold text-primary">
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
        /* List/Table View */
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden sm:table-cell">Phone</TableHead>
                <TableHead className="hidden md:table-cell">Last Visit</TableHead>
                <TableHead>Visits</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => {
                const lastVisit = getLastVisit(customer)
                const totalSpent = getTotalSpent(customer)
                return (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer"
                    onClick={() => openDetail(customer)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8 border border-primary/10">
                          <AvatarFallback className="bg-primary/5 text-primary text-xs font-semibold">
                            {getInitials(customer.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{customer.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {customer.phone}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {lastVisit ? format(new Date(lastVisit), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {customer.appointments?.length || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {totalSpent > 0 ? formatRWF(totalSpent) : '—'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add Customer Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              Enter the customer details below to add them to your records.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Name *</Label>
              <Input
                id="new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Customer name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-phone">Phone *</Label>
              <Input
                id="new-phone"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+250788XXXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-notes">Notes</Label>
              <Textarea
                id="new-notes"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Any notes about this customer..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              className=""
              onClick={handleAddCustomer}
              disabled={saving}
            >
              {saving && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-lg max-sm:max-w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>
              {isViewOnly ? 'View customer information and visit history.' : 'View and edit customer information below.'}
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-5">
              {/* Customer Info Section */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={editName}
                    onChange={(e) => canEdit && setEditName(e.target.value)}
                    readOnly={!canEdit}
                    className={!canEdit ? 'bg-muted' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={editPhone}
                    onChange={(e) => canEdit && setEditPhone(e.target.value)}
                    readOnly={!canEdit}
                    className={!canEdit ? 'bg-muted' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Textarea
                    id="edit-notes"
                    value={editNotes}
                    onChange={(e) => canEdit && setEditNotes(e.target.value)}
                    readOnly={!canEdit}
                    className={!canEdit ? 'bg-muted' : ''}
                    rows={2}
                  />
                </div>
                {isViewOnly && (
                  <p className="text-xs text-muted-foreground italic">
                    Read-only access — contact admin to make changes
                  </p>
                )}
              </div>

              <Separator />

              {/* Visit History */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Visit History</h4>
                {selectedCustomer.appointments?.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No visits yet.</p>
                ) : (
                  <ScrollArea className="max-h-64">
                    <div className="space-y-2 pr-3">
                      {selectedCustomer.appointments?.map((apt) => (
                        <div
                          key={apt.id}
                          className="flex items-start justify-between gap-2 p-3 rounded-lg border bg-card"
                        >
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">
                              {apt.service?.name || 'Service'}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <CalendarDays className="size-3" />
                              {format(new Date(apt.date), 'MMM d, yyyy')}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="size-3" />
                              {apt.startTime} - {apt.endTime}
                            </p>
                            {apt.staff?.name && (
                              <p className="text-xs text-muted-foreground">
                                Stylist: {apt.staff.name}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1.5 ml-3 shrink-0">
                            <Badge
                              className={cn(STATUS_CONFIG[apt.status as AppointmentStatus]?.badgeClass, "border text-[11px] px-2 py-0.5 shadow-sm")}
                            >
                              {STATUS_CONFIG[apt.status as AppointmentStatus]?.label || apt.status}
                            </Badge>
                            {apt.service?.price > 0 && (
                              <span className="text-xs font-semibold text-primary">
                                {formatRWF(apt.service.price)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          )}
          {canEdit && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                Cancel
              </Button>
              <Button
                className=""
                onClick={handleUpdateCustomer}
                disabled={saving}
              >
                {saving && <Loader2 className="size-4 mr-1.5 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
