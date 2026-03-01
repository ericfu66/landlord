import { getDb, saveDb } from '@/lib/db'

export type AutoSaveTrigger = 'recruit' | 'daily_settlement' | 'building' | 'interaction' | 'manual'

export interface SaveSlot {
  id: number
  userId: number
  saveName: string
  gameData: string
  createdAt: string
  updatedAt: string
}

export const MAX_SAVE_SLOTS = 5

export function shouldAutoSaveOn(trigger: AutoSaveTrigger): boolean {
  const autoSaveTriggers: AutoSaveTrigger[] = ['recruit', 'daily_settlement', 'building', 'interaction']
  return autoSaveTriggers.includes(trigger)
}

export async function getSavesByUser(userId: number): Promise<SaveSlot[]> {
  const db = await getDb()
  const result = db.exec(
    `SELECT id, user_id, save_name, game_data, created_at, updated_at
     FROM saves WHERE user_id = ? ORDER BY updated_at DESC`,
    [userId]
  )

  if (result.length === 0) {
    return []
  }

  return result[0].values.map((row) => ({
    id: row[0] as number,
    userId: row[1] as number,
    saveName: row[2] as string,
    gameData: row[3] as string,
    createdAt: row[4] as string,
    updatedAt: row[5] as string
  }))
}

export async function getSaveById(saveId: number, userId: number): Promise<SaveSlot | null> {
  const db = await getDb()
  const result = db.exec(
    `SELECT id, user_id, save_name, game_data, created_at, updated_at
     FROM saves WHERE id = ? AND user_id = ?`,
    [saveId, userId]
  )

  if (result.length === 0 || result[0].values.length === 0) {
    return null
  }

  const row = result[0].values[0]
  return {
    id: row[0] as number,
    userId: row[1] as number,
    saveName: row[2] as string,
    gameData: row[3] as string,
    createdAt: row[4] as string,
    updatedAt: row[5] as string
  }
}

export async function createSave(
  userId: number,
  saveName: string,
  gameData: Record<string, unknown>
): Promise<SaveSlot | null> {
  const db = await getDb()
  
  const existingSaves = await getSavesByUser(userId)
  if (existingSaves.length >= MAX_SAVE_SLOTS) {
    return null
  }

  db.run(
    'INSERT INTO saves (user_id, save_name, game_data) VALUES (?, ?, ?)',
    [userId, saveName, JSON.stringify(gameData)]
  )
  saveDb()

  const result = db.exec('SELECT last_insert_rowid()')
  const id = result[0].values[0][0] as number

  return getSaveById(id, userId)
}

export async function updateSave(
  saveId: number,
  userId: number,
  gameData: Record<string, unknown>
): Promise<boolean> {
  const db = await getDb()
  
  const existing = await getSaveById(saveId, userId)
  if (!existing) {
    return false
  }

  db.run(
    'UPDATE saves SET game_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [JSON.stringify(gameData), saveId]
  )
  saveDb()

  return true
}

export async function deleteSave(saveId: number, userId: number): Promise<boolean> {
  const db = await getDb()
  
  const existing = await getSaveById(saveId, userId)
  if (!existing) {
    return false
  }

  db.run('DELETE FROM saves WHERE id = ?', [saveId])
  saveDb()

  return true
}

export async function autoSave(
  userId: number,
  trigger: AutoSaveTrigger,
  gameData: Record<string, unknown>
): Promise<SaveSlot | null> {
  if (!shouldAutoSaveOn(trigger)) {
    return null
  }

  const saves = await getSavesByUser(userId)
  const autoSaveName = `自动存档 - ${trigger}`
  
  const existingAutoSave = saves.find((s) => s.saveName.startsWith('自动存档'))
  
  if (existingAutoSave) {
    await updateSave(existingAutoSave.id, userId, gameData)
    return getSaveById(existingAutoSave.id, userId)
  }

  return createSave(userId, autoSaveName, gameData)
}

export async function loadSave(saveId: number, userId: number): Promise<Record<string, unknown> | null> {
  const save = await getSaveById(saveId, userId)
  if (!save) {
    return null
  }

  return JSON.parse(save.gameData)
}

export async function getSaveCount(userId: number): Promise<number> {
  const saves = await getSavesByUser(userId)
  return saves.length
}

export async function canCreateSave(userId: number): Promise<boolean> {
  const count = await getSaveCount(userId)
  return count < MAX_SAVE_SLOTS
}