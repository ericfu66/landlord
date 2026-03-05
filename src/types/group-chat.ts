export type GroupChatMessageType = 'text' | 'transfer' | 'sticker' | 'summary'

export interface GroupChatMessage {
  id?: number
  saveId: number
  senderType: 'player' | 'character' | 'system'
  senderName: string
  content: string
  messageType: GroupChatMessageType
  transferAmount?: number
  stickerUrl?: string
  stickerEmotion?: string
  replyToId?: number
  chainDepth?: number
  isSummarized?: boolean
  createdAt?: string
}

export interface GroupChatSummary {
  id?: number
  saveId: number
  summaryIndex: number
  messageRange: string
  summaryContent: string
  selected: boolean
  createdAt?: string
}

export interface SendGroupChatRequest {
  content: string
  mentionedCharacters?: string[]
}

export interface RestartGroupChatRequest {
  keepRecentCount?: number
}