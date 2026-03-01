import { create } from 'zustand'

interface GameState {
  currency: number
  energy: number
  debtDays: number
  totalFloors: number
  weather: string
  currentTime: string
  currentJob: {
    name: string
    salary: number
    daysWorked: number
  } | null
  
  setCurrency: (currency: number) => void
  setEnergy: (energy: number) => void
  setDebtDays: (debtDays: number) => void
  setTotalFloors: (totalFloors: number) => void
  setWeather: (weather: string) => void
  setCurrentTime: (time: string) => void
  setCurrentJob: (job: { name: string; salary: number; daysWorked: number } | null) => void
  
  addCurrency: (amount: number) => void
  deductCurrency: (amount: number) => boolean
  deductEnergy: (amount: number) => boolean
  resetEnergy: () => void
  
  loadFromServer: (data: {
    currency: number
    energy: number
    debtDays: number
    totalFloors: number
    weather: string
    currentTime: string
    currentJob: { name: string; salary: number; daysWorked: number } | null
  }) => void
}

export const useGameStore = create<GameState>((set, get) => ({
  currency: 1000,
  energy: 3,
  debtDays: 0,
  totalFloors: 1,
  weather: '晴',
  currentTime: '08:00',
  currentJob: null,

  setCurrency: (currency) => set({ currency }),
  setEnergy: (energy) => set({ energy }),
  setDebtDays: (debtDays) => set({ debtDays }),
  setTotalFloors: (totalFloors) => set({ totalFloors }),
  setWeather: (weather) => set({ weather }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setCurrentJob: (currentJob) => set({ currentJob }),

  addCurrency: (amount) => set((state) => ({ currency: state.currency + amount })),
  
  deductCurrency: (amount) => {
    const state = get()
    if (state.currency < amount) return false
    set({ currency: state.currency - amount })
    return true
  },

  deductEnergy: (amount) => {
    const state = get()
    if (state.energy < amount) return false
    set({ energy: state.energy - amount })
    return true
  },

  resetEnergy: () => set({ energy: 3 }),

  loadFromServer: (data) => set(data)
}))