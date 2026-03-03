export type WorkshopItemType = 'character' | 'worldview'

export interface WorkshopItem {
  id: number
  type: WorkshopItemType
  userId: number
  originalId: string
  name: string
  description: string
  data: string // JSON string
  downloads: number
  rating: number
  isPublic: boolean
  createdAt: string
  authorName?: string
}

export interface WorkshopUploadRequest {
  type: WorkshopItemType
  originalId: string
  name: string
  description: string
  isPublic: boolean
}

export interface WorkshopDownloadResult {
  success: boolean
  item?: any
  error?: string
}

export interface WorkshopCharacterData {
  template: any
  portraitUrl?: string
  rent: number
}

export interface WorkshopWorldviewData {
  description: string
  content: string
  isAiGenerated: boolean
}
