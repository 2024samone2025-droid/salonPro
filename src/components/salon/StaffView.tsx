'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Phone,
  UserCog,
  Loader2,
  ShieldCheck,
  Scissors,
  Headset,
} from 'lucide-react'
import { toast } from 'sonner'
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

const roleBadgeVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  stylist: 'secondary',
  receptionist: 'outline',
}

const roleColors: Record<string, string> = {
  stylist: 'bg-teal-100 text-teal-800 hover:bg-teal-100',
  receptionist: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
}

const roleAvatarColors: Record<string, string> = {
  stylist: 'bg-teal-50 text-teal-700',
  receptionist: 'bg-purple-50 text-purple-700',
}

const roleIcons: Record<string, React.ReactNode> = {
  stylist: <Scissors className="size-3.5" />,
  receptionist: <Headset className="size-3.5" />,
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function StaffView() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<StaffMember | null>(null)
  const [saving, setSaving] = useState(false)

  const { permissions, authFetch } = useAuth()
  const canManage = permissions?.canManageStaff ?? false
  const isViewOnly = permissions?.staff === 'view'

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('stylist')

  const fetchStaff = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/staff')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setStaff(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load staff')
    } finally {
      setLoading(false)
    }
  }, [authFetch])

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
    if (!name.trim()) {
      toast.error('Staff name is required')
      return
    }
    setSaving(true)
    try {
      const method = editing ? 'PUT' : 'POST'
      const body = editing
        ? { id: editing.id, name: name.trim(), phone: phone.trim(), role }
        : { name: name.trim(), phone: phone.trim(), role }
      const res = await authFetch('/api/staff', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success(editing ? 'Staff member updated' : 'Staff member added')
        setShowDialog(false)
        fetchStaff()
      } else {
        toast.error('Failed to save staff member')
      }
    } catch {
      toast.error('Failed to save staff member')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (s: StaffMember) => {
    if (!canManage) return
    try {
      const res = await authFetch('/api/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id, active: !s.active }),
      })
      if (res.ok) {
        toast.success(s.active ? `${s.name} deactivated` : `${s.name} activated`)
        fetchStaff()
      } else {
        toast.error('Failed to update staff status')
      }
    } catch {
      toast.error('Failed to update staff status')
    }
  }

  const activeStaff = staff.filter((s) => s.active)
  const inactiveStaff = staff.filter((s) => !s.active)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Staff</h2>
          <p className="text-muted-foreground text-sm">
            {staff.length} member{staff.length !== 1 ? 's' : ''} &middot; {activeStaff.length} active
            {isViewOnly && ' · View only'}
          </p>
        </div>
        {canManage && (
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={openAdd}
          >
            <Plus className="size-4 mr-1.5" />
            Add Staff
          </Button>
        )}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="size-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : staff.length === 0 ? (
        /* Empty State */
        <Card>
          <CardContent className="p-12 text-center">
            <div className="mx-auto size-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
              <UserCog className="size-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No staff members</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Get started by adding your first staff member
            </p>
            {canManage && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={openAdd}
              >
                <Plus className="size-4 mr-1.5" /> Add Staff Member
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Active Staff */}
          {activeStaff.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                Active ({activeStaff.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeStaff.map((s) => (
                  <Card
                    key={s.id}
                    className={`transition-all hover:shadow-md hover:border-emerald-200 ${canManage ? 'cursor-pointer' : ''}`}
                    onClick={() => openEdit(s)}
                  >
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-12 border">
                            <AvatarFallback className={`${roleAvatarColors[s.role] || 'bg-muted text-muted-foreground'} text-sm font-semibold`}>
                              {getInitials(s.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-base">{s.name}</CardTitle>
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Phone className="size-3" />
                              {s.phone || 'No phone'}
                            </p>
                          </div>
                        </div>
                        {canManage ? (
                          <div
                            className="flex items-center gap-2 min-h-[44px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Label htmlFor={`active-${s.id}`} className="text-xs text-muted-foreground cursor-pointer hidden sm:block">
                              Active
                            </Label>
                            <Switch
                              id={`active-${s.id}`}
                              checked={s.active}
                              onCheckedChange={() => handleToggleActive(s)}
                            />
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-xs text-emerald-700 border-emerald-200">
                            Active
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4 px-4 pt-1">
                      <Badge className={`${roleColors[s.role] || 'bg-gray-100 text-gray-800'} border-0 text-xs gap-1`}>
                        {roleIcons[s.role]}
                        {roleLabels[s.role] || s.role}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Inactive Staff */}
          {inactiveStaff.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                Inactive ({inactiveStaff.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactiveStaff.map((s) => (
                  <Card
                    key={s.id}
                    className={`opacity-60 transition-all hover:shadow-md ${canManage ? 'cursor-pointer' : ''}`}
                    onClick={() => openEdit(s)}
                  >
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-12 border grayscale">
                            <AvatarFallback className="bg-muted text-muted-foreground text-sm font-semibold">
                              {getInitials(s.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-base">{s.name}</CardTitle>
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Phone className="size-3" />
                              {s.phone || 'No phone'}
                            </p>
                          </div>
                        </div>
                        {canManage ? (
                          <div
                            className="flex items-center gap-2 min-h-[44px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Label htmlFor={`active-${s.id}`} className="text-xs text-muted-foreground cursor-pointer hidden sm:block">
                              Inactive
                            </Label>
                            <Switch
                              id={`active-${s.id}`}
                              checked={s.active}
                              onCheckedChange={() => handleToggleActive(s)}
                            />
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4 px-4 pt-1">
                      <Badge variant={roleBadgeVariant[s.role] || 'outline'} className="text-xs gap-1">
                        {roleIcons[s.role]}
                        {roleLabels[s.role] || s.role}
                      </Badge>
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
            <DialogTitle>{editing ? 'Edit Staff Member' : 'Add Staff Member'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update the staff member details below.'
                : 'Fill in the details to add a new staff member.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staff-name">Name *</Label>
              <Input
                id="staff-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Staff name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-phone">Phone</Label>
              <Input
                id="staff-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+250788XXXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="staff-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stylist">
                    <span className="flex items-center gap-2">
                      <Scissors className="size-3.5" />
                      Stylist
                    </span>
                  </SelectItem>
                  <SelectItem value="receptionist">
                    <span className="flex items-center gap-2">
                      <Headset className="size-3.5" />
                      Receptionist
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
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
              {editing ? 'Save Changes' : 'Add Staff Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
