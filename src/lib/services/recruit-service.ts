import { getDb, saveDb, safeInt, safeSqlString } from '@/lib/db'
import { SpecialVariableData, StagePersonality } from '@/prompts/character-template'

export type { SpecialVariableData, StagePersonality }

export interface CharacterTemplate {
  角色档案: {
    基本信息: {
      姓名: string
      年龄: number
      性别: string
      身份: string
      标签: string[]
    }
    外貌特征: {
      整体印象: string
      发型: string
      面部: string
      身材: string
      穿着打扮: string
    }
    性格特点: {
      核心特质: string
      表现形式: string
      对用户的表现: string
    }
    背景设定: {
      家庭背景: string
      经济状况: string
      成长经历: string
      社交关系: string
    }
    语言特征: {
      音色: string
      说话习惯: string
      口头禅: string
    }
    关系设定: {
      与用户的关系: string
      相识过程: string
      互动方式: string
    }
  }
  来源类型: 'modern' | 'crossover'
  穿越说明?: string
}

export interface Character {
  name: string
  userId: number
  template: CharacterTemplate
  portraitUrl?: string
  favorability: number
  obedience: number
  corruption: number
  rent?: number
  mood: string
  roomId?: number
  worldviewId?: number
  specialVarName?: string
  specialVarValue?: number
  specialVarStages?: SpecialVariableData['分阶段人设']
}

export function normalizeCharacter(raw: Record<string, unknown>): CharacterTemplate | null {
  try {
    if (!raw.角色档案) {
      return null
    }
    
    return raw as unknown as CharacterTemplate
  } catch {
    return null
  }
}

export function getCurrentStagePersonality(
  value: number,
  stages: SpecialVariableData['分阶段人设']
): SpecialVariableData['分阶段人设'][0] | null {
  if (!stages || stages.length === 0) return null
  
  for (const stage of stages) {
    const [min, max] = stage.阶段范围.split('-').map(Number)
    if (value >= min && value < max) {
      return stage
    }
    // Handle the last stage (80-100)
    if (value === 100 && max === 100 && value >= min) {
      return stage
    }
  }
  return stages[0]
}

export async function createCharacter(
  userId: number,
  template: CharacterTemplate,
  roomId?: number,
  worldviewId?: number,
  specialVarData?: SpecialVariableData
): Promise<Character | null> {
  const db = await getDb()
  const safeUserId = safeInt(userId)
  const safeRoomId = roomId ? safeInt(roomId) : null
  const safeWorldviewId = worldviewId ? safeInt(worldviewId) : null
  
  const name = template.角色档案.基本信息.姓名
  
  const existing = db.exec(`SELECT name FROM characters WHERE name = '${safeSqlString(name)}'`)
  if (existing && existing.length > 0 && existing[0].values && existing[0].values.length > 0) {
    return null
  }
  
  const rent = Math.floor(Math.random() * 300) + 200
  
  const templateJson = safeSqlString(JSON.stringify(template))
  const roomIdValue = safeRoomId ?? 'NULL'
  const worldviewIdValue = safeWorldviewId ?? 'NULL'
  
  // Handle special variable data
  const specialVarName = specialVarData ? safeSqlString(specialVarData.变量名) : null
  const specialVarValue = specialVarData ? safeInt(specialVarData.初始值) : 0
  const specialVarStages = specialVarData ? safeSqlString(JSON.stringify(specialVarData.分阶段人设)) : null
  
  const specialVarNameValue = specialVarName ? `'${specialVarName}'` : 'NULL'
  const specialVarStagesValue = specialVarStages ? `'${specialVarStages}'` : 'NULL'
  
  db.run(
    `INSERT INTO characters (name, user_id, template, favorability, obedience, corruption, rent, mood, room_id, worldview_id, special_var_name, special_var_value, special_var_stages)
     VALUES ('${safeSqlString(name)}', ${safeUserId}, '${templateJson}', 0, 0, 0, ${rent}, '平静', ${roomIdValue}, ${worldviewIdValue}, ${specialVarNameValue}, ${specialVarValue}, ${specialVarStagesValue})`
  )
  
  if (safeRoomId) {
    db.run(
      `UPDATE rooms SET character_name = '${safeSqlString(name)}' WHERE id = ${safeRoomId}`
    )
  }
  
  saveDb()
  
  return {
    name,
    userId,
    template,
    favorability: 0,
    obedience: 0,
    corruption: 0,
    rent,
    mood: '平静',
    roomId,
    worldviewId,
    specialVarName: specialVarData?.变量名,
    specialVarValue: specialVarData?.初始值,
    specialVarStages: specialVarData?.分阶段人设
  }
}

export async function getCharactersByUser(userId: number): Promise<Character[]> {
  const db = await getDb()
  const result = db.exec(
    `SELECT name, user_id, template, portrait_url, favorability, obedience, corruption, rent, mood, room_id, worldview_id, special_var_name, special_var_value, special_var_stages
     FROM characters WHERE user_id = ${userId}`
  )
  
  if (!result || result.length === 0 || !result[0].values) {
    return []
  }
  
  return result[0].values.map((row: unknown[]) => ({
    name: row[0] as string,
    userId: row[1] as number,
    template: JSON.parse(row[2] as string) as CharacterTemplate,
    portraitUrl: row[3] as string | undefined,
    favorability: row[4] as number,
    obedience: row[5] as number,
    corruption: row[6] as number,
    rent: row[7] as number | undefined,
    mood: row[8] as string,
    roomId: row[9] as number | undefined,
    worldviewId: row[10] as number | undefined,
    specialVarName: row[11] as string | undefined,
    specialVarValue: row[12] as number | undefined,
    specialVarStages: row[13] ? JSON.parse(row[13] as string) as SpecialVariableData['分阶段人设'] : undefined
  }))
}

export async function updateCharacterPortrait(name: string, portraitUrl: string): Promise<void> {
  const db = await getDb()
  db.run(`UPDATE characters SET portrait_url = '${safeSqlString(portraitUrl)}' WHERE name = '${safeSqlString(name)}'`)
  saveDb()
}

export async function updateCharacterRoom(name: string, roomId: number | null): Promise<void> {
  const db = await getDb()
  
  const safeRoomId = roomId === null ? null : safeInt(roomId)
  const roomIdValue = safeRoomId ?? 'NULL'
  db.run(`UPDATE characters SET room_id = ${roomIdValue} WHERE name = '${safeSqlString(name)}'`)
  
  if (safeRoomId) {
    db.run(`UPDATE rooms SET character_name = '${safeSqlString(name)}' WHERE id = ${safeRoomId}`)
  } else {
    db.run(`UPDATE rooms SET character_name = NULL WHERE character_name = '${safeSqlString(name)}'`)
  }
  
  saveDb()
}
