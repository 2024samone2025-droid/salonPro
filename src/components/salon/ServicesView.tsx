'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Scissors, Clock } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

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

  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [duration, setDuration] = useState('')

  const fetchServices = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/services')
      const data = await res.json()
      setServices(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  const openAdd = () => {
    setEditing(null)
    setName('')
    setPrice('')
    setDuration('')
    setShowDialog(true)
  }

  const openEdit = (s: Service) => {
    setEditing(s)
    setName(s.name)
    setPrice(s.price.toString())
    setDuration(s.duration.toString())
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!name || !price || !duration) {
      toast({ title: 'Error', description: 'All fields are required', variant: 'destructive' })
      return
    }
    try {
      const method = editing ? 'PUT' : 'POST'
      const body = editing
        ? { id: editing.id, name, price: parseFloat(price), duration: parseInt(duration) }
        : { name, price: parseFloat(price), duration: parseInt(duration) }
      const res = await fetch('/api/services', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast({ title: editing ? 'Service Updated' : 'Service Added' })
        setShowDialog(false)
        fetchServices()
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save service', variant: 'destructive' })
    }
  }

  const handleToggleActive = async (s: Service) => {
    try {
      const res = await fetch('/api/services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id, active: !s.active }),
      })
      if (res.ok) {
        toast({ title: s.active ? 'Service Deactivated' : 'Service Activated' })
        fetchServices()
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update service', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Services</h2>
          <p className="text-muted-foreground text-sm">{services.length} services</p>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={openAdd}
        >
          <Plus className="size-4 mr-1" />
          Add Service
        </Button>
      </div>

      {/* Service List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Scissors className="size-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No services yet.</p>
            <Button
              className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={openAdd}
            >
              <Plus className="size-4 mr-1" /> Add Service
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {services.map((s) => (
            <Card
              key={s.id}
              className={`transition-opacity ${!s.active ? 'opacity-60' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => openEdit(s)}
                  >
                    <p className="font-medium">{s.name}</p>
                    <p className="text-lg font-bold text-emerald-700 mt-1">
                      {formatRWF(s.price)}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="size-3" />
                      {s.duration} min
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {s.active ? 'Active' : 'Inactive'}
                    </span>
                    <Switch
                      checked={s.active}
                      onCheckedChange={() => handleToggleActive(s)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Service' : 'Add Service'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Service Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Haircut"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Price (RWF)</Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="5000"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="30"
                className="mt-1"
              />
            </div>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSave}
            >
              {editing ? 'Save Changes' : 'Add Service'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
