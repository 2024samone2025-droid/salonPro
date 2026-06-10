// Role → permissions matrix. Client-safe (no server imports) so the
// settings UI can render it; src/lib/auth.ts re-exports for server use.

export type UserRole = 'admin' | 'receptionist' | 'stylist'

export interface Permissions {
  // Module access
  dashboard: 'full' | 'view' | 'own' | 'none'
  appointments: 'full' | 'view' | 'own' | 'none'
  customers: 'full' | 'view' | 'none'
  staff: 'full' | 'view' | 'none'
  services: 'full' | 'view' | 'none'
  reports: 'full' | 'view' | 'none'
  // Special permissions
  canCreateAppointment: boolean
  canUpdateAppointmentStatus: boolean
  canManagePayments: boolean
  canManageStaff: boolean
  canManageServices: boolean
  canDeleteRecords: boolean
  canViewAllAppointments: boolean
}

export const ROLE_PERMISSIONS: Record<UserRole, Permissions> = {
  admin: {
    dashboard: 'full',
    appointments: 'full',
    customers: 'full',
    staff: 'full',
    services: 'full',
    reports: 'full',
    canCreateAppointment: true,
    canUpdateAppointmentStatus: true,
    canManagePayments: true,
    canManageStaff: true,
    canManageServices: true,
    canDeleteRecords: true,
    canViewAllAppointments: true,
  },
  receptionist: {
    dashboard: 'full',
    appointments: 'full',
    customers: 'full',
    staff: 'view',
    services: 'view',
    reports: 'view',
    canCreateAppointment: true,
    canUpdateAppointmentStatus: true,
    canManagePayments: true,
    canManageStaff: false,
    canManageServices: false,
    canDeleteRecords: false,
    canViewAllAppointments: true,
  },
  stylist: {
    dashboard: 'view',
    appointments: 'own',
    customers: 'view',
    staff: 'none',
    services: 'view',
    reports: 'none',
    canCreateAppointment: false,
    canUpdateAppointmentStatus: true,
    canManagePayments: false,
    canManageStaff: false,
    canManageServices: false,
    canDeleteRecords: false,
    canViewAllAppointments: false,
  },
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  receptionist: 'Receptionist',
  stylist: 'Stylist',
}

// Human-readable rows for the read-only permission matrix in settings
export const PERMISSION_MATRIX_ROWS: { key: keyof Permissions; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'appointments', label: 'Appointments' },
  { key: 'customers', label: 'Customers' },
  { key: 'staff', label: 'Staff' },
  { key: 'services', label: 'Services' },
  { key: 'reports', label: 'Reports' },
  { key: 'canCreateAppointment', label: 'Create appointments' },
  { key: 'canUpdateAppointmentStatus', label: 'Update appointment status' },
  { key: 'canManagePayments', label: 'Manage payments' },
  { key: 'canManageStaff', label: 'Manage staff' },
  { key: 'canManageServices', label: 'Manage services' },
  { key: 'canDeleteRecords', label: 'Delete records' },
  { key: 'canViewAllAppointments', label: 'See all appointments' },
]
