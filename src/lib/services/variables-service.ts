import { getDb, saveDb } from '@/lib/db'
import { SpecialVariableData } from '@/prompts/character-template'
import { getCurrentStagePersonality } from './recruit-service'

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
  specialVarDelta?: number
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
    `SELECT favorability, obedience, corruption, special_var_name, special_var_value, special_var_stages FROM characters WHERE name = '${escapeSql(characterName)}'`
  )
  
  if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) {
    return false
  }
  
  const row = result[0].values[0]
  const currentFav = row[0] as number
  const currentObey = row[1] as number
  const currentCorrupt = row[2] as number
  const specialVarName = row[3] as string | null
  const currentSpecialVar = row[4] as number | null
  const specialVarStagesJson = row[5] as string | null
  
  const clampedFavDelta = clampDelta(updates.favorabilityDelta, -10, 10)
  const clampedObeyDelta = clampDelta(updates.obedienceDelta, -5, 5)
  const clampedCorruptDelta = clampDelta(updates.corruptionDelta, -5, 5)
  
  const newFav = clampValue(currentFav + clampedFavDelta)
  const newObey = clampValue(currentObey + clampedObeyDelta)
  const newCorrupt = clampValue(currentCorrupt + clampedCorruptDelta)
  
  // Handle special variable update if it exists
  let specialVarUpdate = ''
  if (specialVarName && currentSpecialVar !== null && updates.specialVarDelta !== undefined) {
    const clampedSpecialDelta = clampDelta(updates.specialVarDelta, -10, 10)
    const newSpecialVar = clampValue(currentSpecialVar + clampedSpecialDelta, 0, 100)
    specialVarUpdate = `, special_var_value = ${newSpecialVar}`
  }
  
  db.run(
    `UPDATE characters SET favorability = ${newFav}, obedience = ${newObey}, corruption = ${newCorrupt}, mood = '${escapeSql(updates.mood)}'${specialVarUpdate} WHERE name = '${escapeSql(characterName)}'`
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
  specialVarName?: string
  specialVarValue?: number
  currentStagePersonality?: string
}

export async function getCharacterVariables(characterName: string): Promise<VariableDisplayData | null> {
  const db = await getDb()
  const result = db.exec(
    `SELECT favorability, obedience, corruption, mood, special_var_name, special_var_value, special_var_stages FROM characters WHERE name = '${escapeSql(characterName)}'`
  )
  
  if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) {
    return null
  }
  
  const row = result[0].values[0]
  const specialVarName = row[4] as string | null
  const specialVarValue = row[5] as number | null
  const specialVarStagesJson = row[6] as string | null
  
  let currentStagePersonality: string | undefined
  if (specialVarName && specialVarValue !== null && specialVarStagesJson) {
    const stages = JSON.parse(specialVarStagesJson) as SpecialVariableData['分阶段人设']
    const currentStage = getCurrentStagePersonality(specialVarValue, stages)
    if (currentStage) {
      currentStagePersonality = `[${currentStage.阶段名称}] ${currentStage.人格表现}`
    }
  }
  
  return {
    favorability: row[0] as number,
    obedience: row[1] as number,
    corruption: row[2] as number,
    mood: row[3] as string,
    specialVarName: specialVarName || undefined,
    specialVarValue: specialVarValue || undefined,
    currentStagePersonality
  }
}
