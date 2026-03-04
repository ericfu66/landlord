import { getDb, saveDb, safeInt, safeSqlString } from '@/lib/db'
import { Preset, PresetEntry, PresetConfig, InteractionMode } from '@/types/preset'
import { generateId } from '@/lib/db'
import { DEFAULT_PRESETS } from './preset-client'

export { DEFAULT_PRESETS, getInteractionModeInfo, canUseFlirtMode, canUseDateMode } from './preset-client'

export function composeMessages(
  config: PresetConfig, 
  worldviewContent?: string
): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = []

  // 1. 世界观背景（最先注入）
  if (worldviewContent) {
    messages.push({ 
      role: 'system', 
      content: `【世界观背景】\n${worldviewContent}\n\n请在此世界观背景下进行角色扮演。` 
    })
  }

  // 2. 核心角色设定（身份声明）
  messages.push({ role: 'system', content: config.fixed.persona })

  // 3. 角色记忆
  messages.push({ role: 'system', content: `【你的记忆】\n${config.fixed.memory}` })

  // 4. 预设的示例对话（用于few-shot学习）
  const sortedCustom = [...config.custom].sort((a, b) => a.order - b.order)
  for (const entry of sortedCustom) {
    messages.push({ role: entry.role, content: entry.content })
  }

  // 5. 聊天记录（展示之前的对话）
  if (config.fixed.history && config.fixed.history !== '暂无聊天记录') {
    messages.push({ role: 'system', content: `【之前的对话记录】\n${config.fixed.history}` })
  }

  // 6. 用户（房东）的最新输入
  messages.push({ role: 'user', content: `房东对你说：${config.userInput}` })

  return messages
}

export async function getPreset(userId: number, presetType: InteractionMode): Promise<Preset | null> {
  const db = await getDb()
  const safeUserId = safeInt(userId)
  const safePresetType = safeSqlString(presetType)
  const result = db.exec(
    `SELECT id, user_id, preset_type, preset_data FROM presets WHERE user_id = ${safeUserId} AND preset_type = '${safePresetType}'`
  )

  if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) {
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
  const safeUserId = safeInt(userId)
  const safePresetType = safeSqlString(presetType)
  
  const existing = await getPreset(safeUserId, presetType)
  
  if (existing) {
    const entriesJson = safeSqlString(JSON.stringify({ entries }))
    const safeExistingId = safeInt(existing.id)
    db.run(
      `UPDATE presets SET preset_data = '${entriesJson}' WHERE id = ${safeExistingId}`
    )
    saveDb()
    return { ...existing, presetData: { entries } }
  }

  const presetDataJson = safeSqlString(JSON.stringify({ entries }))
  db.run(
    `INSERT INTO presets (user_id, preset_type, preset_data) VALUES (${safeUserId}, '${safePresetType}', '${presetDataJson}')`
  )
  saveDb()

  // Get the ID of the inserted preset
  const result = db.exec(`SELECT id FROM presets WHERE user_id = ${safeUserId} ORDER BY id DESC LIMIT 1`)
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