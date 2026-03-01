import { getDb, saveDb } from '@/lib/db'

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
  saveId: number
  template: CharacterTemplate
  portraitUrl?: string
  favorability: number
  obedience: number
  corruption: number
  rent?: number
  mood: string
  roomId?: number
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

export async function createCharacter(
  saveId: number,
  template: CharacterTemplate,
  roomId?: number
): Promise<Character | null> {
  const db = await getDb()
  
  const name = template.角色档案.基本信息.姓名
  
  const existing = db.exec('SELECT name FROM characters WHERE name = ?', [name])
  if (existing.length > 0 && existing[0].values.length > 0) {
    return null
  }
  
  const rent = Math.floor(Math.random() * 300) + 200
  
  db.run(
    `INSERT INTO characters (name, save_id, template, favorability, obedience, corruption, rent, mood, room_id)
     VALUES (?, ?, ?, 0, 0, 0, ?, '平静', ?)`,
    [name, saveId, JSON.stringify(template), rent, roomId || null]
  )
  
  if (roomId) {
    db.run(
      'UPDATE rooms SET character_name = ? WHERE id = ?',
      [name, roomId]
    )
  }
  
  saveDb()
  
  return {
    name,
    saveId,
    template,
    favorability: 0,
    obedience: 0,
    corruption: 0,
    rent,
    mood: '平静',
    roomId
  }
}

export async function getCharactersBySave(saveId: number): Promise<Character[]> {
  const db = await getDb()
  const result = db.exec(
    `SELECT name, save_id, template, portrait_url, favorability, obedience, corruption, rent, mood, room_id
     FROM characters WHERE save_id = ?`,
    [saveId]
  )
  
  if (result.length === 0) {
    return []
  }
  
  return result[0].values.map((row) => ({
    name: row[0] as string,
    saveId: row[1] as number,
    template: JSON.parse(row[2] as string) as CharacterTemplate,
    portraitUrl: row[3] as string | undefined,
    favorability: row[4] as number,
    obedience: row[5] as number,
    corruption: row[6] as number,
    rent: row[7] as number | undefined,
    mood: row[8] as string,
    roomId: row[9] as number | undefined
  }))
}

export async function updateCharacterPortrait(name: string, portraitUrl: string): Promise<void> {
  const db = await getDb()
  db.run('UPDATE characters SET portrait_url = ? WHERE name = ?', [portraitUrl, name])
  saveDb()
}

export async function updateCharacterRoom(name: string, roomId: number | null): Promise<void> {
  const db = await getDb()
  
  db.run('UPDATE characters SET room_id = ? WHERE name = ?', [roomId, name])
  
  if (roomId) {
    db.run('UPDATE rooms SET character_name = ? WHERE id = ?', [name, roomId])
  } else {
    db.run('UPDATE rooms SET character_name = NULL WHERE character_name = ?', [name])
  }
  
  saveDb()
}