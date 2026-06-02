'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Plus,
  Scissors,
  Clock,
  Loader2,
  DollarSign,
  Timer,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'

interface Service {
  id: string
  name: string
  price: number
  duration: number
  active: boolean
  createdAt: string
}

function formatRWF(amount: number) {
  return new Intl.NumberFormat('en-RW').format(amount) + ' RWF'
}

export default function ServicesView() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [saving, setSaving] = useState(false)

  const { permissions, authFetch } = useAuth()
  const canManage = permissions?.canManageServices ?? false

  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [duration, setDuration] = useState('')

  const fetchServices = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/services')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setServices(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load services')
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  const openAdd = () => {
    if (!canManage) return
    setEditing(null)
    setName('')
    setPrice('')
    setDuration('')
    setShowDialog(true)
  }

  const openEdit = (s: Service) => {
    if (!canManage) return
    setEditing(s)
    setName(s.name)
    setPrice(s.price.toString())
    setDuration(s.duration.toString())
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Service name is required')
      return
    }
    if (!price || parseFloat(price) <= 0) {
      toast.error('Please enter a valid price')
      return
    }
    if (!duration || parseInt(duration) <= 0) {
      toast.error('Please enter a valid duration')
      return
    }
    setSaving(true)
    try {
      const method = editing ? 'PUT' : 'POST'
      const body = editing
        ? { id: editing.id, name: name.trim(), price: parseFloat(price), duration: parseInt(duration) }
        : { name: name.trim(), price: parseFloat(price), duration: parseInt(duration) }
      const res = await authFetch('/api/services', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success(editing ? 'Service updated' : 'Service added')
        setShowDialog(false)
        fetchServices()
      } else {
        toast.error('Failed to save service')
      }
    } catch {
      toast.error('Failed to save service')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (s: Service) => {
    if (!canManage) return
    try {
      const res = await authFetch('/api/services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id, active: !s.active }),
      })
      if (res.ok) {
        toast.success(s.active ? `${s.name} deactivated` : `${s.name} activated`)
        fetchServices()
      } else {
        toast.error('Failed to update service status')
      }
    } catch {
      toast.error('Failed to update service status')
    }
  }

  const activeServices = services.filter((s) => s.active)
  const inactiveServices = services.filter((s) => !s.active)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Services</h2>
          <p className="text-muted-foreground text-sm">
            {services.length} service{services.length !== 1 ? 's' : ''} &middot; {activeServices.length} active
            {!canManage && ' · View only'}
          </p>
        </div>
        {canManage && (
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={openAdd}
          >
            <Plus className="size-4 mr-1.5" />
            Add Service
          </Button>
        )}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-7 w-28" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : services.length === 0 ? (
        /* Empty State */
        <Card>
          <CardContent className="p-12 text-center">
            <div className="mx-auto size-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
              <Scissors className="size-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No services yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Get started by adding your first service
            </p>
            {canManage && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={openAdd}
              >
                <Plus className="size-4 mr-1.5" /> Add Service
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Active Services */}
          {activeServices.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                Active ({activeServices.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeServices.map((s) => (
                  <Card
                    key={s.id}
                    className={`transition-all hover:shadow-md hover:border-emerald-200 ${canManage ? 'cursor-pointer' : ''}`}
                    onClick={() => openEdit(s)}
                  >
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="size-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                            <Scissors className="size-4 text-emerald-600" />
                          </div>
                          <CardTitle className="text-base">{s.name}</CardTitle>
                        </div>
                        {canManage ? (
                          <div
                            className="flex items-center gap-2 min-h-[44px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Label htmlFor={`svc-active-${s.id}`} className="text-xs text-muted-foreground cursor-pointer hidden sm:block">
                              Active
                            </Label>
                            <Switch
                              id={`svc-active-${s.id}`}
                              checked={s.active}
                              onCheckedChange={() => handleToggleActive(s)}
                            />
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-xs text-emerald-700 border-emerald-200 shrink-0">
                            Active
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4 px-4 pt-2">
                      <div className="flex items-end justify-between">
                        <div className="space-y-1">
                          <p className="text-xl font-bold text-emerald-700">
                            {formatRWF(s.price)}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="size-3.5" />
                            {s.duration} min
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Inactive Services */}
          {inactiveServices.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                Inactive ({inactiveServices.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactiveServices.map((s) => (
                  <Card
                    key={s.id}
                    className={`opacity-60 transition-all hover:shadow-md ${canManage ? 'cursor-pointer' : ''}`}
                    onClick={() => openEdit(s)}
                  >
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Scissors className="size-4 text-muted-foreground" />
                          </div>
                          <CardTitle className="text-base">{s.name}</CardTitle>
                        </div>
                        {canManage ? (
                          <div
                            className="flex items-center gap-2 min-h-[44px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Label htmlFor={`svc-active-${s.id}`} className="text-xs text-muted-foreground cursor-pointer hidden sm:block">
                              Inactive
                            </Label>
                            <Switch
                              id={`svc-active-${s.id}`}
                              checked={s.active}
                              onCheckedChange={() => handleToggleActive(s)}
                            />
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4 px-4 pt-2">
                      <div className="flex items-end justify-between">
                        <div className="space-y-1">
                          <p className="text-xl font-bold text-muted-foreground">
                            {formatRWF(s.price)}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="size-3.5" />
                            {s.duration} min
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Dialog - only for admin */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Service' : 'Add Service'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update the service details below.'
                : 'Fill in the details to add a new service offering.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="svc-name">Service Name *</Label>
              <Input
                id="svc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Haircut, Braids, Manicure"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="svc-price">Price (RWF) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="svc-price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="5000"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="svc-duration">Duration (min) *</Label>
                <div className="relative">
                  <Timer className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="svc-duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="30"
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSave}
              disabled={saving}
            >
              {saving && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              {editing ? 'Save Changes' : 'Add Service'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
