export interface DiaryEntry {
  id: number
  characterName: string
  userId: number
  date: string
  content: string
  mood: string
  isPeeked: boolean
  createdAt: string
}

export interface DiaryRequest {
  type: 'ask' | 'peek'
  characterName: string
  date?: string // 如果不指定则生成当天的
}
