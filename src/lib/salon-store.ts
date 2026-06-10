import { create } from 'zustand'

interface SalonInfo {
  id: string
  name: string
  subdomain: string
  plan: string
}

interface SalonStore {
  selectedDate: string
  setSelectedDate: (date: string) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  commandOpen: boolean
  setCommandOpen: (open: boolean) => void
  salon: SalonInfo | null
  setSalon: (salon: SalonInfo | null) => void
}

export const useSalonStore = create<SalonStore>((set) => ({
  selectedDate: new Date().toISOString().split('T')[0],
  setSelectedDate: (date) => set({ selectedDate: date }),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  commandOpen: false,
  setCommandOpen: (open) => set({ commandOpen: open }),
  salon: null,
  setSalon: (salon) => set({ salon }),
}))
