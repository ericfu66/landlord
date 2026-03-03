import { getDb, saveDb } from '@/lib/db'

// 转义 SQL 字符串
function escapeSql(str: string): string {
  return str.replace(/'/g, "''")
}

export interface VariableUpdate {
  characterName: string
  favorabilityDelta: number
  obedienceDelta: number
  corruptionDelta: number
  mood: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function pickLastThreeRounds(messages: ChatMessage[]): ChatMessage[] {
  const threeRounds = 6
  if (messages.length <= threeRounds) {
    return messages
  }
  return messages.slice(-threeRounds)
}

export function clampValue(value: number, min: number = -100, max: number = 100): number {
  return Math.max(min, Math.min(max, value))
}

export function clampDelta(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export async function updateCharacterVariables(
  characterName: string,
  updates: VariableUpdate
): Promise<boolean> {
  const db = await getDb()
  
  const result = db.exec(
    `SELECT favorability, obedience, corruption FROM characters WHERE name = '${escapeSql(characterName)}'`
  )
  
  if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) {
    return false
  }
  
  const row = result[0].values[0]
  const currentFav = row[0] as number
  const currentObey = row[1] as number
  const currentCorrupt = row[2] as number
  
  const clampedFavDelta = clampDelta(updates.favorabilityDelta, -10, 10)
  const clampedObeyDelta = clampDelta(updates.obedienceDelta, -5, 5)
  const clampedCorruptDelta = clampDelta(updates.corruptionDelta, -5, 5)
  
  const newFav = clampValue(currentFav + clampedFavDelta)
  const newObey = clampValue(currentObey + clampedObeyDelta)
  const newCorrupt = clampValue(currentCorrupt + clampedCorruptDelta)
  
  db.run(
    `UPDATE characters SET favorability = ${newFav}, obedience = ${newObey}, corruption = ${newCorrupt}, mood = '${escapeSql(updates.mood)}' WHERE name = '${escapeSql(characterName)}'`
  )
  saveDb()
  
  return true
}

export async function getChatMessagesForUpdate(characterName: string): Promise<ChatMessage[]> {
  const db = await getDb()
  const result = db.exec(
    `SELECT role, content FROM chat_messages 
     WHERE character_name = '${escapeSql(characterName)}' 
     ORDER BY created_at DESC LIMIT 6`
  )
  
  if (!result || result.length === 0 || !result[0].values) {
    return []
  }
  
  return result[0].values
    .map((row: unknown[]) => ({
      role: row[0] as 'user' | 'assistant',
      content: row[1] as string
    }))
    .reverse()
}

export async function isVariableUpdateLocked(characterName: string): Promise<boolean> {
  return false
}

export interface VariableDisplayData {
  favorability: number
  obedience: number
  corruption: number
  mood: string
}

export async function getCharacterVariables(characterName: string): Promise<VariableDisplayData | null> {
  const db = await getDb()
  const result = db.exec(
    `SELECT favorability, obedience, corruption, mood FROM characters WHERE name = '${escapeSql(characterName)}'`
  )
  
  if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) {
    return null
  }
  
  const row = result[0].values[0]
  return {
    favorability: row[0] as number,
    obedience: row[1] as number,
    corruption: row[2] as number,
    mood: row[3] as string
  }
}
