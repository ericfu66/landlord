import { getDb, saveDb, safeInt, safeSqlString } from '@/lib/db'

export type AutoSaveTrigger = 'recruit' | 'daily_settlement' | 'building' | 'interaction' | 'manual'

export interface GameData {
  state: {
    currency: number
    energy: number
    debtDays: number
    totalFloors: number
    weather: string
    currentTime: string
    currentJob: {
      name: string
      salary: number
      daysWorked: number
    } | null
  }
  characters: Array<{
    name: string
    template: string
    portrait_url?: string
    favorability: number
    obedience: number
    corruption: number
    rent?: number
    mood: string
    room_id?: number
  }>
  rooms: Array<{
    id: number
    floor: number
    position_start: number
    position_end: number
    room_type: string
    description?: string
    name?: string
    character_name?: string
    is_outdoor: boolean
  }>
}

export function shouldAutoSaveOn(trigger: AutoSaveTrigger): boolean {
  const autoSaveTriggers: AutoSaveTrigger[] = ['recruit', 'daily_settlement', 'building', 'interaction']
  return autoSaveTriggers.includes(trigger)
}



/**
 * 收集用户的所有游戏数据
 */
export async function collectGameData(userId: number): Promise<GameData> {
  const db = await getDb()

  // 1. 获取游戏状态
  const stateResult = db.exec(
    `SELECT currency, energy, debt_days, total_floors, weather, current_time, current_job
     FROM users WHERE id = ${userId}`
  )

  const state = stateResult && stateResult.length > 0 && stateResult[0].values && stateResult[0].values.length > 0
    ? {
        currency: (stateResult[0].values[0][0] as number) ?? 1000,
        energy: (stateResult[0].values[0][1] as number) ?? 3,
        debtDays: (stateResult[0].values[0][2] as number) ?? 0,
        totalFloors: (stateResult[0].values[0][3] as number) ?? 1,
        weather: (stateResult[0].values[0][4] as string) || '晴',
        currentTime: (stateResult[0].values[0][5] as string) || '08:00',
        currentJob: stateResult[0].values[0][6] 
          ? JSON.parse(stateResult[0].values[0][6] as string) 
          : null
      }
    : {
        currency: 1000,
        energy: 3,
        debtDays: 0,
        totalFloors: 1,
        weather: '晴',
        currentTime: '08:00',
        currentJob: null
      }

  // 2. 获取角色数据
  const charResult = db.exec(
    `SELECT name, template, portrait_url, favorability, obedience, corruption, rent, mood, room_id
     FROM characters WHERE user_id = ${userId}`
  )

  const characters = charResult && charResult.length > 0 && charResult[0].values
    ? charResult[0].values.map((row: unknown[]) => ({
        name: row[0] as string,
        template: row[1] as string,
        portrait_url: row[2] as string | undefined,
        favorability: (row[3] as number) ?? 0,
        obedience: (row[4] as number) ?? 0,
        corruption: (row[5] as number) ?? 0,
        rent: row[6] as number | undefined,
        mood: (row[7] as string) || '平静',
        room_id: row[8] as number | undefined
      }))
    : []

  // 3. 获取房间数据
  const roomResult = db.exec(
    `SELECT id, floor, position_start, position_end, room_type, description, name, character_name, is_outdoor
     FROM rooms WHERE user_id = ${userId}`
  )

  const rooms = roomResult && roomResult.length > 0 && roomResult[0].values
    ? roomResult[0].values.map((row: unknown[]) => ({
        id: row[0] as number,
        floor: row[1] as number,
        position_start: row[2] as number,
        position_end: row[3] as number,
        room_type: row[4] as string,
        description: row[5] as string | undefined,
        name: row[6] as string | undefined,
        character_name: row[7] as string | undefined,
        is_outdoor: (row[8] as number) === 1
      }))
    : []

  return { state, characters, rooms }
}

/**
 * 保存游戏数据到用户记录
 */
export async function saveGameData(userId: number, gameData: GameData): Promise<boolean> {
  try {
    const db = await getDb()
    const safeUserId = safeInt(userId)
    const { state } = gameData

    // 更新用户表中的游戏状态
    const currentJobJson = state.currentJob ? `'${safeSqlString(JSON.stringify(state.currentJob))}'` : 'NULL'
    
    db.run(`UPDATE users SET 
      currency = ${safeInt(state.currency)},
      energy = ${safeInt(state.energy)},
      debt_days = ${safeInt(state.debtDays)},
      total_floors = ${safeInt(state.totalFloors)},
      weather = '${safeSqlString(state.weather)}',
      current_time = '${safeSqlString(state.currentTime)}',
      current_job = ${currentJobJson},
      updated_at = CURRENT_TIMESTAMP
      WHERE id = ${safeUserId}`)

    saveDb()
    return true
  } catch (error) {
    console.error('saveGameData error:', error)
    return false
  }
}

/**
 * 导出游戏数据（用于下载备份）
 */
export async function exportGameData(userId: number): Promise<string | null> {
  try {
    const gameData = await collectGameData(userId)
    return JSON.stringify(gameData, null, 2)
  } catch (error) {
    console.error('exportGameData error:', error)
    return null
  }
}

/**
 * 导入游戏数据
 */
export async function importGameData(userId: number, jsonData: string): Promise<boolean> {
  try {
    const gameData = JSON.parse(jsonData) as GameData
    const safeUserId = safeInt(userId)
    
    // 先保存状态到用户表
    await saveGameData(safeUserId, gameData)
    
    const db = await getDb()
    
    // 清除旧的角色和房间数据
    db.run(`DELETE FROM characters WHERE user_id = ${safeUserId}`)
    db.run(`DELETE FROM rooms WHERE user_id = ${safeUserId}`)

    // 恢复角色数据
    for (const char of gameData.characters) {
      const portraitUrl = char.portrait_url ? `'${safeSqlString(char.portrait_url)}'` : 'NULL'
      const rent = char.rent !== undefined ? safeInt(char.rent) : 'NULL'
      const roomId = char.room_id !== undefined ? safeInt(char.room_id) : 'NULL'
      
      db.run(`INSERT INTO characters (name, user_id, template, portrait_url, favorability, obedience, corruption, rent, mood, room_id)
       VALUES ('${safeSqlString(char.name)}', ${safeUserId}, '${safeSqlString(char.template)}', ${portraitUrl}, ${safeInt(char.favorability)}, ${safeInt(char.obedience)}, ${safeInt(char.corruption)}, ${rent}, '${safeSqlString(char.mood)}', ${roomId})`)
    }

    // 恢复房间数据
    for (const room of gameData.rooms) {
      const description = room.description ? `'${safeSqlString(room.description)}'` : 'NULL'
      const name = room.name ? `'${safeSqlString(room.name)}'` : 'NULL'
      const charName = room.character_name ? `'${safeSqlString(room.character_name)}'` : 'NULL'
      const isOutdoor = room.is_outdoor ? 1 : 0
      
      db.run(`INSERT INTO rooms (id, user_id, floor, position_start, position_end, room_type, description, name, character_name, is_outdoor)
       VALUES (${safeInt(room.id)}, ${safeUserId}, ${safeInt(room.floor)}, ${safeInt(room.position_start)}, ${safeInt(room.position_end)}, '${safeSqlString(room.room_type)}', ${description}, ${name}, ${charName}, ${isOutdoor})`)
    }

    saveDb()
    return true
  } catch (error) {
    console.error('importGameData error:', error)
    return false
  }
}

/**
 * 重置用户游戏数据
 */
export async function resetGameData(userId: number): Promise<boolean> {
  try {
    const db = await getDb()
    const safeUserId = safeInt(userId)
    
    // 重置用户游戏状态
    db.run(`UPDATE users SET 
      currency = 1000,
      energy = 3,
      debt_days = 0,
      total_floors = 1,
      weather = '晴',
      current_time = '08:00',
      current_job = NULL,
      recruit_count = 0,
      updated_at = CURRENT_TIMESTAMP
      WHERE id = ${safeUserId}`)
    
    // 删除角色和房间
    db.run(`DELETE FROM characters WHERE user_id = ${safeUserId}`)
    db.run(`DELETE FROM rooms WHERE user_id = ${safeUserId}`)
    
    saveDb()
    return true
  } catch (error) {
    console.error('resetGameData error:', error)
    return false
  }
}

/**
 * 获取当前游戏状态（用于前端显示）
 */
export async function getCurrentGameState(userId: number): Promise<{
  state: GameData['state']
  characterCount: number
  roomCount: number
} | null> {
  try {
    const db = await getDb()
    const safeUserId = safeInt(userId)

    // 获取游戏状态
    const stateResult = db.exec(
      `SELECT currency, energy, debt_days, total_floors, weather, current_time, current_job
       FROM users WHERE id = ${safeUserId}`
    )

    if (!stateResult || stateResult.length === 0 || !stateResult[0].values || stateResult[0].values.length === 0) {
      return null
    }

    const row = stateResult[0].values[0]
    const state = {
      currency: (row[0] as number) ?? 1000,
      energy: (row[1] as number) ?? 3,
      debtDays: (row[2] as number) ?? 0,
      totalFloors: (row[3] as number) ?? 1,
      weather: (row[4] as string) || '晴',
      currentTime: (row[5] as string) || '08:00',
      currentJob: row[6] ? JSON.parse(row[6] as string) : null
    }

    // 获取角色和房间数量
    const charCountResult = db.exec(
      `SELECT COUNT(*) FROM characters WHERE user_id = ${safeUserId}`
    )
    const roomCountResult = db.exec(
      `SELECT COUNT(*) FROM rooms WHERE user_id = ${safeUserId}`
    )

    return {
      state,
      characterCount: (charCountResult[0]?.values[0][0] as number) || 0,
      roomCount: (roomCountResult[0]?.values[0][0] as number) || 0
    }
  } catch (error) {
    console.error('getCurrentGameState error:', error)
    return null
  }
}
