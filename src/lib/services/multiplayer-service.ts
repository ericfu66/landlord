import { getDb, saveDb } from '@/lib/db'
import { MultiplayerSettings, VisitRecord, VisitableUser, RemoteBuilding, RemoteCharacter } from '@/types/multiplayer'
import { getCharactersByUser } from './recruit-service'
import { getRoomsByUser } from './building-service'

function escapeSql(str: string): string {
  return str.replace(/'/g, "''")
}

export async function getMultiplayerSettings(userId: number): Promise<MultiplayerSettings> {
  const db = await getDb()
  
  const result = db.exec(
    `SELECT user_id, allow_visits, allow_interactions, allow_character_interactions 
     FROM multiplayer_settings WHERE user_id = ${userId}`
  )
  
  if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) {
    db.run(
      `INSERT INTO multiplayer_settings (user_id, allow_visits, allow_interactions, allow_character_interactions) 
       VALUES (${userId}, 1, 1, 1)`
    )
    saveDb()
    
    return {
      userId,
      allowVisits: true,
      allowInteractions: true,
      allowCharacterInteractions: true
    }
  }
  
  const row = result[0].values[0]
  return {
    userId: row[0] as number,
    allowVisits: row[1] === 1,
    allowInteractions: row[2] === 1,
    allowCharacterInteractions: row[3] === 1
  }
}

export async function updateMultiplayerSettings(
  userId: number,
  settings: Partial<MultiplayerSettings>
): Promise<MultiplayerSettings> {
  const db = await getDb()
  
  const sets: string[] = []
  if (settings.allowVisits !== undefined) sets.push(`allow_visits = ${settings.allowVisits ? 1 : 0}`)
  if (settings.allowInteractions !== undefined) sets.push(`allow_interactions = ${settings.allowInteractions ? 1 : 0}`)
  if (settings.allowCharacterInteractions !== undefined) sets.push(`allow_character_interactions = ${settings.allowCharacterInteractions ? 1 : 0}`)
  
  if (sets.length > 0) {
    db.run(`UPDATE multiplayer_settings SET ${sets.join(', ')} WHERE user_id = ${userId}`)
    saveDb()
  }
  
  return getMultiplayerSettings(userId)
}

export async function getVisitableUsers(): Promise<VisitableUser[]> {
  const db = await getDb()
  
  const result = db.exec(`
    SELECT u.id, u.username, u.total_floors, 
           (SELECT COUNT(*) FROM characters c WHERE c.user_id = u.id) as character_count,
           COALESCE(ms.allow_visits, 1) as allow_visits
    FROM users u
    LEFT JOIN multiplayer_settings ms ON u.id = ms.user_id
    WHERE COALESCE(ms.allow_visits, 1) = 1
    ORDER BY u.total_floors DESC
    LIMIT 50
  `)
  
  if (!result || result.length === 0 || !result[0].values) {
    return []
  }
  
  return result[0].values.map((row: unknown[]) => ({
    userId: row[0] as number,
    username: row[1] as string,
    totalFloors: row[2] as number,
    characterCount: row[3] as number,
    allowVisits: row[4] === 1
  }))
}

export async function getRemoteBuilding(userId: number, visitorUserId: number): Promise<RemoteBuilding | null> {
  const db = await getDb()
  
  // 检查是否允许访问
  const settings = await getMultiplayerSettings(userId)
  if (!settings.allowVisits) {
    return null
  }
  
  const rooms = await getRoomsByUser(userId)
  
  // 按楼层分组
  const floors: RemoteBuilding['floors'] = []
  const floorMap = new Map<number, typeof floors[0]>()
  
  for (const room of rooms) {
    if (!floorMap.has(room.floor)) {
      floorMap.set(room.floor, {
        floor: room.floor,
        rooms: []
      })
      floors.push(floorMap.get(room.floor)!)
    }
    
    const roomData: any = {
      id: room.id,
      roomType: room.roomType,
      name: room.name,
      description: room.description
    }
    
    if (room.characterName) {
      roomData.characterName = room.characterName
      const charResult = db.exec(
        `SELECT portrait_url FROM characters WHERE name = '${escapeSql(room.characterName)}' AND user_id = ${userId}`
      )
      if (charResult && charResult.length > 0 && charResult[0].values) {
        roomData.characterPortrait = charResult[0].values[0][0] as string
      }
    }
    
    floorMap.get(room.floor)!.rooms.push(roomData)
  }
  
  // 记录访问
  await recordVisit(userId, visitorUserId)
  
  return { floors }
}

export async function getRemoteCharacters(userId: number): Promise<RemoteCharacter[]> {
  // 检查是否允许角色互动
  const settings = await getMultiplayerSettings(userId)
  if (!settings.allowCharacterInteractions) {
    return []
  }
  
  const characters = await getCharactersByUser(userId)
  
  return characters.map(char => ({
    name: char.name,
    template: char.template,
    portraitUrl: char.portraitUrl,
    mood: char.mood,
    favorability: char.favorability
  }))
}

export async function getRemoteCharacter(userId: number, characterName: string): Promise<RemoteCharacter | null> {
  const settings = await getMultiplayerSettings(userId)
  if (!settings.allowCharacterInteractions) {
    return null
  }
  
  const characters = await getCharactersByUser(userId)
  const char = characters.find(c => c.name === characterName)
  
  if (!char) return null
  
  return {
    name: char.name,
    template: char.template,
    portraitUrl: char.portraitUrl,
    mood: char.mood,
    favorability: char.favorability
  }
}

export async function recordVisit(hostUserId: number, visitorUserId: number): Promise<void> {
  const db = await getDb()
  
  db.run(
    `INSERT INTO multiplayer_visits (host_user_id, visitor_user_id) VALUES (${hostUserId}, ${visitorUserId})`
  )
  saveDb()
}

export async function getVisitHistory(userId: number): Promise<VisitRecord[]> {
  const db = await getDb()
  
  const result = db.exec(`
    SELECT v.id, v.host_user_id, v.visitor_user_id, v.visited_at, u.username as visitor_name
    FROM multiplayer_visits v
    JOIN users u ON v.visitor_user_id = u.id
    WHERE v.host_user_id = ${userId}
    ORDER BY v.visited_at DESC
    LIMIT 20
  `)
  
  if (!result || result.length === 0 || !result[0].values) {
    return []
  }
  
  return result[0].values.map((row: unknown[]) => ({
    id: row[0] as number,
    hostUserId: row[1] as number,
    visitorUserId: row[2] as number,
    visitedAt: row[3] as string,
    visitorName: row[4] as string
  }))
}
