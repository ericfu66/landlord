import { getDb, saveDb, safeInt, safeSqlString } from '@/lib/db'
import { Preset, PresetEntry, PresetConfig, InteractionMode, PresetEntryType, PersonaPosition } from '@/types/preset'
import { generateId } from '@/lib/db'
import { DEFAULT_PRESETS } from './preset-client'

export { DEFAULT_PRESETS, getInteractionModeInfo, canUseFlirtMode, canUseDateMode } from './preset-client'

export function composeMessages(
  config: PresetConfig, 
  worldviewContent?: string
): Array<{ role: string; content: string }> {
  // 获取人设插入位置，默认为世界观之后
  const personaPosition = config.personaPosition || 'after_worldview'

  // 分离不同类型的条目
  const sortedEntries = [...config.custom].sort((a, b) => a.order - b.order)
  
  // 查找是否有人设条目（persona类型）
  const personaEntries = sortedEntries.filter(e => e.type === 'persona')
  const memoryEntries = sortedEntries.filter(e => e.type === 'memory')
  const historyEntries = sortedEntries.filter(e => e.type === 'history')
  const modeEntries = sortedEntries.filter(e => e.type === 'mode')
  const regularEntries = sortedEntries.filter(e => !e.type || e.type === 'custom')

  // 构建各个部分的内容
  const worldviewMessage = worldviewContent 
    ? { role: 'system', content: `【世界观背景】\n${worldviewContent}\n\n请在此世界观背景下进行角色扮演。` }
    : null

  // 人设内容
  const personaContent: Array<{ role: string; content: string }> = []
  if (personaEntries.length > 0) {
    for (const entry of personaEntries) {
      personaContent.push({ role: entry.role, content: entry.content })
    }
  } else {
    personaContent.push({ role: 'system', content: config.fixed.persona })
  }

  // 记忆内容
  const memoryContent: Array<{ role: string; content: string }> = []
  if (memoryEntries.length > 0) {
    for (const entry of memoryEntries) {
      memoryContent.push({ role: entry.role, content: entry.content })
    }
  } else {
    memoryContent.push({ role: 'system', content: `【你的记忆】\n${config.fixed.memory}` })
  }

  // 模式提示
  const modeContent: Array<{ role: string; content: string }> = []
  if (modeEntries.length > 0) {
    for (const entry of modeEntries) {
      modeContent.push({ role: entry.role, content: entry.content })
    }
  }

  // 示例对话
  const regularContent = regularEntries.map(entry => ({ 
    role: entry.role, 
    content: entry.content 
  }))

  // 历史记录
  const historyContent: Array<{ role: string; content: string }> = []
  if (historyEntries.length > 0) {
    for (const entry of historyEntries) {
      historyContent.push({ role: entry.role, content: entry.content })
    }
  } else if (config.fixed.history && config.fixed.history !== '暂无聊天记录') {
    historyContent.push({ role: 'system', content: `【之前的对话记录】\n${config.fixed.history}` })
  }

  // 用户输入
  const userMessage = { role: 'user', content: `房东对你说：${config.userInput}` }

  // 根据 personaPosition 组合消息
  const messages: Array<{ role: string; content: string }> = []

  switch (personaPosition) {
    case 'first':
      // 人设 -> 世界观 -> 记忆 -> 模式 -> 示例 -> 历史 -> 用户
      messages.push(...personaContent)
      if (worldviewMessage) messages.push(worldviewMessage)
      messages.push(...memoryContent)
      messages.push(...modeContent)
      messages.push(...regularContent)
      messages.push(...historyContent)
      messages.push(userMessage)
      break

    case 'after_worldview':
      // 世界观 -> 人设 -> 记忆 -> 模式 -> 示例 -> 历史 -> 用户（默认）
      if (worldviewMessage) messages.push(worldviewMessage)
      messages.push(...personaContent)
      messages.push(...memoryContent)
      messages.push(...modeContent)
      messages.push(...regularContent)
      messages.push(...historyContent)
      messages.push(userMessage)
      break

    case 'after_mode':
      // 世界观 -> 记忆 -> 模式 -> 人设 -> 示例 -> 历史 -> 用户
      if (worldviewMessage) messages.push(worldviewMessage)
      messages.push(...memoryContent)
      messages.push(...modeContent)
      messages.push(...personaContent)
      messages.push(...regularContent)
      messages.push(...historyContent)
      messages.push(userMessage)
      break

    case 'before_history':
      // 世界观 -> 记忆 -> 模式 -> 示例 -> 人设 -> 历史 -> 用户
      if (worldviewMessage) messages.push(worldviewMessage)
      messages.push(...memoryContent)
      messages.push(...modeContent)
      messages.push(...regularContent)
      messages.push(...personaContent)
      messages.push(...historyContent)
      messages.push(userMessage)
      break

    case 'last':
      // 世界观 -> 记忆 -> 模式 -> 示例 -> 历史 -> 人设 -> 用户
      if (worldviewMessage) messages.push(worldviewMessage)
      messages.push(...memoryContent)
      messages.push(...modeContent)
      messages.push(...regularContent)
      messages.push(...historyContent)
      messages.push(...personaContent)
      messages.push(userMessage)
      break

    default:
      // 默认：世界观 -> 人设 -> 记忆 -> 模式 -> 示例 -> 历史 -> 用户
      if (worldviewMessage) messages.push(worldviewMessage)
      messages.push(...personaContent)
      messages.push(...memoryContent)
      messages.push(...modeContent)
      messages.push(...regularContent)
      messages.push(...historyContent)
      messages.push(userMessage)
  }

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
  const presetData = JSON.parse(row[3] as string)
  return {
    id: row[0] as number,
    userId: row[1] as number,
    presetType: row[2] as InteractionMode,
    presetData: {
      entries: presetData.entries || [],
      personaPosition: presetData.personaPosition || 'after_worldview'
    }
  }
}

export async function savePreset(
  userId: number,
  presetType: InteractionMode,
  entries: PresetEntry[],
  personaPosition?: PersonaPosition
): Promise<Preset> {
  const db = await getDb()
  const safeUserId = safeInt(userId)
  const safePresetType = safeSqlString(presetType)
  
  const existing = await getPreset(safeUserId, presetType)
  const position = personaPosition || 'after_worldview'
  
  if (existing) {
    const entriesJson = safeSqlString(JSON.stringify({ entries, personaPosition: position }))
    const safeExistingId = safeInt(existing.id)
    db.run(
      `UPDATE presets SET preset_data = '${entriesJson}' WHERE id = ${safeExistingId}`
    )
    saveDb()
    return { ...existing, presetData: { entries, personaPosition: position } }
  }

  const presetDataJson = safeSqlString(JSON.stringify({ entries, personaPosition: position }))
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
    presetData: { entries, personaPosition: position }
  }
}

export function createPresetEntry(
  role: 'system' | 'user' | 'assistant',
  content: string,
  order: number,
  isFixed: boolean = false,
  type: PresetEntryType = 'custom'
): PresetEntry {
  return {
    id: generateId(),
    role,
    content,
    order,
    isFixed,
    type
  }
}