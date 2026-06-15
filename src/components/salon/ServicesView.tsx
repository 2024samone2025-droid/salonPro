'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { useAuth, useMoney } from '@/lib/auth-context'
import EmptyState from '@/components/salon/EmptyState'

interface Service {
  id: string
  name: string
  price: number
  duration: number
  active: boolean
  category: string
  description: string
  onlineBookable: boolean
  createdAt: string
}

export default function ServicesView() {
  const formatRWF = useMoney()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [saving, setSaving] = useState(false)
  const isInitialMount = useRef(true)

  const { permissions, authFetch } = useAuth()
  const canManage = permissions?.canManageServices ?? false

  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [duration, setDuration] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [onlineBookable, setOnlineBookable] = useState(true)

  const fetchServices = useCallback(async () => {
    if (!isInitialMount.current) {
      setLoading(true)
    }
    isInitialMount.current = false
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
    setCategory('')
    setDescription('')
    setOnlineBookable(true)
    setShowDialog(true)
  }

  const openEdit = (s: Service) => {
    if (!canManage) return
    setEditing(s)
    setName(s.name)
    setPrice(s.price.toString())
    setDuration(s.duration.toString())
    setCategory(s.category ?? '')
    setDescription(s.description ?? '')
    setOnlineBookable(s.onlineBookable ?? true)
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
      const fields = {
        name: name.trim(),
        price: parseFloat(price),
        duration: parseInt(duration),
        category: category.trim(),
        description: description.trim(),
        onlineBookable,
      }
      const body = editing ? { id: editing.id, ...fields } : fields
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
            onClick={openAdd}
            className="h-10 gap-2 shadow-sm w-full sm:w-auto shrink-0"
          >
            <Plus className="size-4" />
            Add Service
          </Button>
        )}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
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
        <EmptyState
          icon={Scissors}
          message="No services yet"
          actionLabel={canManage ? 'Add service' : undefined}
          onAction={canManage ? openAdd : undefined}
        />
      ) : (
        <>
          {/* Active Services */}
          {activeServices.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Active ({activeServices.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeServices.map((s) => (
                  <Card
                    key={s.id}
                    className={`transition-all hover:shadow-md ${canManage ? 'cursor-pointer' : ''}`}
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
                              Active
                            </Label>
                            <Switch
                              id={`svc-active-${s.id}`}
                              checked={s.active}
                              onCheckedChange={() => handleToggleActive(s)}
                            />
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-xs shrink-0">
                            Active
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4 px-4 pt-2">
                      <div className="flex items-end justify-between">
                        <div className="space-y-1">
                          <p className="text-xl font-bold">
                            {formatRWF(s.price)}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="size-3.5" />
                            {s.duration} min
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {s.category && (
                            <Badge variant="outline" className="text-xs">{s.category}</Badge>
                          )}
                          {!s.onlineBookable && (
                            <span className="text-[11px] text-muted-foreground">Front desk only</span>
                          )}
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
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Inactive ({inactiveServices.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
            <div className="space-y-2">
              <Label htmlFor="svc-category">Category</Label>
              <Input
                id="svc-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Hair, Nails, Skin"
                maxLength={40}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-description">Description</Label>
              <Textarea
                id="svc-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Shown to customers on the booking page."
                maxLength={280}
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Bookable online</p>
                <p className="text-xs text-muted-foreground">
                  When off, this service is front-desk only and hidden from the public booking page.
                </p>
              </div>
              <Switch
                checked={onlineBookable}
                onCheckedChange={setOnlineBookable}
                aria-label="Bookable online"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
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
