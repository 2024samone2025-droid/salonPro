import { create } from 'zustand'

export type ViewTab = 'dashboard' | 'appointments' | 'customers' | 'staff' | 'services' | 'reports'

interface SalonStore {
  activeTab: ViewTab
  setActiveTab: (tab: ViewTab) => void
  selectedDate: string
  setSelectedDate: (date: string) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  commandOpen: boolean
  setCommandOpen: (open: boolean) => void
}

export const useSalonStore = create<SalonStore>((set) => ({
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),
  selectedDate: new Date().toISOString().split('T')[0],
  setSelectedDate: (date) => set({ selectedDate: date }),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  commandOpen: false,
  setCommandOpen: (open) => set({ commandOpen: open }),
}))
