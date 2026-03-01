export type InteractionMode = 'daily' | 'date' | 'flirt' | 'free'

export interface PresetEntry {
  id: string
  role: 'system' | 'user' | 'assistant'
  content: string
  order: number
  isFixed: boolean
}

export interface Preset {
  id: number
  userId: number
  presetType: InteractionMode
  presetData: {
    entries: PresetEntry[]
  }
}

export interface PresetConfig {
  fixed: {
    persona: string
    memory: string
    history: string
  }
  custom: PresetEntry[]
  userInput: string
}