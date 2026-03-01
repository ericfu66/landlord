import { getDb, saveDb } from '@/lib/db'
import { Preset, PresetEntry, PresetConfig, InteractionMode } from '@/types/preset'
import { generateId } from '@/lib/db'
import { DEFAULT_PRESETS } from './preset-client'

export { DEFAULT_PRESETS, getInteractionModeInfo, canUseFlirtMode } from './preset-client'

export function composeMessages(config: PresetConfig): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = []

  messages.push({ role: 'system', content: config.fixed.persona })
  messages.push({ role: 'system', content: `记忆：\n${config.fixed.memory}` })
  messages.push({ role: 'system', content: `聊天记录：\n${config.fixed.history}` })

  const sortedCustom = [...config.custom].sort((a, b) => a.order - b.order)
  for (const entry of sortedCustom) {
    messages.push({ role: entry.role, content: entry.content })
  }

  messages.push({ role: 'user', content: config.userInput })

  return messages
}

export async function getPreset(userId: number, presetType: InteractionMode): Promise<Preset | null> {
  const db = await getDb()
  const result = db.exec(
    'SELECT id, user_id, preset_type, preset_data FROM presets WHERE user_id = ? AND preset_type = ?',
    [userId, presetType]
  )

  if (result.length === 0 || result[0].values.length === 0) {
    return null
  }

  const row = result[0].values[0]
  return {
    id: row[0] as number,
    userId: row[1] as number,
    presetType: row[2] as InteractionMode,
    presetData: JSON.parse(row[3] as string)
  }
}

export async function savePreset(
  userId: number,
  presetType: InteractionMode,
  entries: PresetEntry[]
): Promise<Preset> {
  const db = await getDb()
  
  const existing = await getPreset(userId, presetType)
  
  if (existing) {
    db.run(
      'UPDATE presets SET preset_data = ? WHERE id = ?',
      [JSON.stringify({ entries }), existing.id]
    )
    saveDb()
    return { ...existing, presetData: { entries } }
  }

  db.run(
    'INSERT INTO presets (user_id, preset_type, preset_data) VALUES (?, ?, ?)',
    [userId, presetType, JSON.stringify({ entries })]
  )
  saveDb()

  const result = db.exec('SELECT last_insert_rowid()')
  const id = result[0].values[0][0] as number

  return {
    id,
    userId,
    presetType,
    presetData: { entries }
  }
}

export function createPresetEntry(
  role: 'system' | 'user' | 'assistant',
  content: string,
  order: number,
  isFixed: boolean = false
): PresetEntry {
  return {
    id: generateId(),
    role,
    content,
    order,
    isFixed
  }
}