export type InteractionMode = 'daily' | 'date' | 'flirt' | 'free'

export type PresetEntryType = 'persona' | 'memory' | 'history' | 'mode' | 'custom'

export type PersonaPosition = 
  | 'first'           // 最前面（世界观之前）
  | 'after_worldview' // 世界观之后（默认）
  | 'after_mode'      // 模式提示之后
  | 'before_history'  // 历史记录之前
  | 'last'            // 最后（用户输入之前）

export interface PresetEntry {
  id: string
  role: 'system' | 'user' | 'assistant'
  content: string
  order: number
  isFixed: boolean
  type?: PresetEntryType
}

export interface Preset {
  id: number
  userId: number
  presetType: InteractionMode
  presetData: {
    entries: PresetEntry[]
    personaPosition?: PersonaPosition
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
  personaPosition?: PersonaPosition
}
