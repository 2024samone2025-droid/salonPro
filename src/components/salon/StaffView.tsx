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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Phone, UserCog, Lock } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/auth-context'

interface StaffMember {
  id: string
  name: string
  phone: string
  role: string
  active: boolean
  createdAt: string
}

const roleLabels: Record<string, string> = {
  stylist: 'Stylist',
  receptionist: 'Receptionist',
}

const roleColors: Record<string, string> = {
  stylist: 'bg-emerald-100 text-emerald-800',
  receptionist: 'bg-purple-100 text-purple-800',
}

export default function StaffView() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<StaffMember | null>(null)

  const { permissions } = useAuth()
  const canManage = permissions?.canManageStaff ?? false
  const isViewOnly = permissions?.staff === 'view'

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('stylist')

  const fetchStaff = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/staff')
      const data = await res.json()
      setStaff(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStaff()
  }, [fetchStaff])

  const openAdd = () => {
    if (!canManage) return
    setEditing(null)
    setName('')
    setPhone('')
    setRole('stylist')
    setShowDialog(true)
  }

  const openEdit = (s: StaffMember) => {
    if (!canManage) return
    setEditing(s)
    setName(s.name)
    setPhone(s.phone)
    setRole(s.role)
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!name) {
      toast({ title: 'Error', description: 'Name is required', variant: 'destructive' })
      return
    }
    try {
      const url = '/api/staff'
      const method = editing ? 'PUT' : 'POST'
      const body = editing
        ? { id: editing.id, name, phone, role }
        : { name, phone, role }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast({ title: editing ? 'Staff Updated' : 'Staff Added' })
        setShowDialog(false)
        fetchStaff()
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save staff', variant: 'destructive' })
    }
  }

  const handleToggleActive = async (s: StaffMember) => {
    if (!canManage) return
    try {
      const res = await fetch('/api/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id, active: !s.active }),
      })
      if (res.ok) {
        toast({ title: s.active ? 'Staff Deactivated' : 'Staff Activated' })
        fetchStaff()
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update staff', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Staff</h2>
          <p className="text-muted-foreground text-sm">{staff.length} staff members {!canManage && '• View only'}</p>
        </div>
        {canManage && (
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={openAdd}
          >
            <Plus className="size-4 mr-1" />
            Add Staff
          </Button>
        )}
      </div>

      {/* Staff List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : staff.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <UserCog className="size-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No staff members yet.</p>
            {canManage && (
              <Button
                className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={openAdd}
              >
                <Plus className="size-4 mr-1" /> Add Staff Member
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {staff.map((s) => (
            <Card
              key={s.id}
              className={`transition-opacity ${!s.active ? 'opacity-60' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div
                    className={`flex-1 ${canManage ? 'cursor-pointer' : ''}`}
                    onClick={() => openEdit(s)}
                  >
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="size-3" />
                      {s.phone || 'No phone'}
                    </p>
                    <Badge className={`${roleColors[s.role] || ''} border-0 text-xs mt-1`}>
                      {roleLabels[s.role] || s.role}
                    </Badge>
                  </div>
                  {canManage ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {s.active ? 'Active' : 'Inactive'}
                      </span>
                      <Switch
                        checked={s.active}
                        onCheckedChange={() => handleToggleActive(s)}
                      />
                    </div>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      {s.active ? 'Active' : 'Inactive'}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog - only for admin */}
      {canManage && (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Staff Member' : 'Add Staff Member'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Staff name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+250788XXXXXX"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stylist">Stylist</SelectItem>
                    <SelectItem value="receptionist">Receptionist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleSave}
              >
                {editing ? 'Save Changes' : 'Add Staff Member'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
