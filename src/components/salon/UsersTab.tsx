'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Check, Loader2, Minus, Plus, Pencil, UserPlus, MoreHorizontal, RefreshCw, Ban } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'
import InviteStaffDialog from './InviteStaffDialog'
import InviteLinkPanel from './InviteLinkPanel'
import {
  PERMISSION_MATRIX_ROWS,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  type UserRole,
} from '@/lib/permissions'

interface UserRow {
  id: string
  name: string
  email: string
  role: UserRole
  active: boolean
  staffId: string | null
  staff: { id: string; name: string } | null
  inviteStatus: 'pending' | 'expired' | null
}

interface StaffOption {
  id: string
  name: string
}

interface FormState {
  id: string | null
  name: string
  email: string
  password: string
  role: UserRole
  staffId: string
  active: boolean
}

const EMPTY_FORM: FormState = {
  id: null,
  name: '',
  email: '',
  password: '',
  role: 'receptionist',
  staffId: '',
  active: true,
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

function accessLabel(value: string | boolean): React.ReactNode {
  if (value === true) return <Check className="size-4 text-success mx-auto" aria-label="Yes" />
  if (value === false) return <Minus className="size-4 text-muted-foreground/40 mx-auto" aria-label="No" />
  if (value === 'none') return <Minus className="size-4 text-muted-foreground/40 mx-auto" aria-label="None" />
  return <span className="text-xs capitalize">{value === 'own' ? 'Own only' : value}</span>
}

export default function UsersTab() {
  const { authFetch, user: currentUser } = useAuth()
  const [users, setUsers] = useState<UserRow[]>([])
  const [staff, setStaff] = useState<StaffOption[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [rotatedUrl, setRotatedUrl] = useState<string | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<UserRow | null>(null)
  const [inviteBusy, setInviteBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const [usersRes, staffRes] = await Promise.all([
        authFetch('/api/users'),
        authFetch('/api/staff'),
      ])
      if (!usersRes.ok) throw new Error()
      setUsers(await usersRes.json())
      setStaff(staffRes.ok ? await staffRes.json() : [])
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (u: UserRow) => {
    setForm({
      id: u.id,
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      staffId: u.staffId || '',
      active: u.active,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (form.name.trim().length < 2) {
      toast.error('Name must be at least 2 characters')
      return
    }
    if (!EMAIL_RE.test(form.email.trim())) {
      toast.error('A valid email is required')
      return
    }
    if (!form.id && form.password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
      return
    }
    if (form.id && form.password && form.password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`New password must be at least ${MIN_PASSWORD_LENGTH} characters`)
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        staffId: form.staffId || null,
        active: form.active,
      }
      if (form.password) payload.password = form.password

      const res = form.id
        ? await authFetch(`/api/users/${form.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await authFetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(body?.error || 'Failed to save user')
        return
      }
      toast.success(form.id ? 'User updated' : 'User created')
      setDialogOpen(false)
      load()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  // Rotate: kill the old link and mint a fresh one, shown for copying. The row
  // stays pending with its 72h window reset.
  const rotateInvite = async (u: UserRow) => {
    setInviteBusy(true)
    try {
      const res = await authFetch('/api/staff/invite/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id, rotate: true }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(body?.error || 'Could not refresh the invite link')
        return
      }
      setRotatedUrl(body.acceptUrl as string)
      load()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setInviteBusy(false)
    }
  }

  // Revoke: invalidate the current link without issuing a new one. The user stays
  // inactive and the row's invite indicator clears.
  const confirmRevoke = async () => {
    if (!revokeTarget) return
    setInviteBusy(true)
    try {
      const res = await authFetch('/api/staff/invite/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: revokeTarget.id }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(body?.error || 'Could not revoke the invite')
        return
      }
      toast.success('Invite revoked')
      setRevokeTarget(null)
      load()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setInviteBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Users table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">User accounts</CardTitle>
              <CardDescription>People who can sign in to this salon.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setInviteOpen(true)}>
                <UserPlus className="size-4" />
                Invite staff
              </Button>
              <Button onClick={openCreate}>
                <Plus className="size-4" />
                Add User
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden sm:table-cell">Linked staff</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.name}
                    {u.id === currentUser?.id && (
                      <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                      {ROLE_LABELS[u.role] || u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {u.staff?.name || '—'}
                  </TableCell>
                  <TableCell>
                    {u.active ? (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                        Active
                      </Badge>
                    ) : u.inviteStatus === 'pending' ? (
                      <Badge variant="outline">Invite pending</Badge>
                    ) : u.inviteStatus === 'expired' ? (
                      <Badge variant="outline" className="bg-muted text-muted-foreground">
                        Invite expired
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-muted text-muted-foreground">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label={`Actions for ${u.name}`}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(u)}>
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        {u.inviteStatus && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => rotateInvite(u)}
                              disabled={inviteBusy}
                            >
                              <RefreshCw className="size-4" />
                              New invite link
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setRevokeTarget(u)}
                              disabled={inviteBusy}
                              className="text-destructive focus:text-destructive"
                            >
                              <Ban className="size-4" />
                              Revoke invite
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Role permission matrix (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">What each role can do</CardTitle>
          <CardDescription>
            Roles are fixed — assign the right role to control a user&apos;s access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permission</TableHead>
                {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
                  <TableHead key={role} className="text-center">
                    {ROLE_LABELS[role]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERMISSION_MATRIX_ROWS.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="text-sm">{row.label}</TableCell>
                  {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
                    <TableCell key={role} className="text-center">
                      {accessLabel(ROLE_PERMISSIONS[role][row.key])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invite staff (one-time link) dialog */}
      <InviteStaffDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        canGrantAdmin={currentUser?.role === 'admin'}
        onInvited={load}
      />

      {/* Rotated invite link (after "New invite link") */}
      <Dialog open={!!rotatedUrl} onOpenChange={(o) => !o && setRotatedUrl(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New invite link</DialogTitle>
            <DialogDescription>
              The previous link no longer works. Send this one instead — it works once and expires in
              72 hours.
            </DialogDescription>
          </DialogHeader>
          {rotatedUrl && <InviteLinkPanel url={rotatedUrl} />}
          <DialogFooter>
            <Button onClick={() => setRotatedUrl(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke confirmation */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this invite?</AlertDialogTitle>
            <AlertDialogDescription>
              The current link for {revokeTarget?.name} stops working immediately. You can send a new
              invite later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={inviteBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRevoke} disabled={inviteBusy}>
              {inviteBusy && <Loader2 className="size-4 animate-spin" />}
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit user' : 'Add user'}</DialogTitle>
            <DialogDescription>
              {form.id
                ? 'Update this user’s access. Leave password empty to keep the current one.'
                : 'They will sign in with this email and password.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="user-name">Name</Label>
              <Input
                id="user-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                maxLength={40}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                autoComplete="off"
                placeholder="name@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-password">{form.id ? 'New password (optional)' : 'Password'}</Label>
              <Input
                id="user-password"
                type="password"
                autoComplete="new-password"
                placeholder={form.id ? 'Leave empty to keep current password' : 'At least 8 characters'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Linked staff member</Label>
              <Select
                value={form.staffId || 'none'}
                onValueChange={(v) => setForm({ ...form, staffId: v === 'none' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Stylists must be linked to a staff member to see their own appointments.
              </p>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">Inactive users cannot sign in.</p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
                aria-label="User active"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {form.id ? 'Save Changes' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
