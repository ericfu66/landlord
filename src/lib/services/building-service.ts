import { getDb, saveDb, safeInt, safeSqlString } from '@/lib/db'
import { Room, RoomPlacement, BUILD_COSTS, FLOOR_CELLS, BuildCost } from '@/types/room'

export { BUILD_COSTS, FLOOR_CELLS, type BuildCost }

export function validatePlacement(
  existingRooms: RoomPlacement[],
  newRoom: RoomPlacement
): { valid: boolean; error?: string } {
  if (newRoom.positionStart < 1 || newRoom.positionEnd > FLOOR_CELLS) {
    return { valid: false, error: '房间位置超出范围' }
  }

  if (newRoom.positionStart >= newRoom.positionEnd) {
    return { valid: false, error: '房间起始位置必须小于结束位置' }
  }

  for (const room of existingRooms) {
    if (room.floor !== newRoom.floor) continue

    const overlap = 
      (newRoom.positionStart < room.positionEnd && newRoom.positionEnd > room.positionStart)
    
    if (overlap) {
      return { valid: false, error: '房间位置重叠' }
    }
  }

  return { valid: true }
}

export function calculateBuildCost(
  roomType: string,
  cellCount: number,
  isNewFloor: boolean
): { currency: number; energy: number } {
  let currency = 0
  let energy = 0

  if (isNewFloor) {
    currency += BUILD_COSTS.newFloor.currency
    energy += BUILD_COSTS.newFloor.energy
  }

  const cost = BUILD_COSTS[roomType] || BUILD_COSTS.emptyRoom
  currency += cost.currency * cellCount
  energy += cost.energy

  return { currency, energy }
}

export function calculateDemolishRefund(
  roomType: string,
  cellCount: number
): number {
  const cost = BUILD_COSTS[roomType] || BUILD_COSTS.emptyRoom
  return Math.floor(cost.currency * cellCount * 0.3)
}

export async function getRoomsByUser(userId: number): Promise<Room[]> {
  const db = await getDb()
  const result = db.exec(
    `SELECT id, user_id, floor, position_start, position_end, room_type, description, name, character_name, is_outdoor
     FROM rooms WHERE user_id = ${userId} ORDER BY floor, position_start`
  )

  if (!result || result.length === 0 || !result[0].values) {
    return []
  }

  return result[0].values.map((row: unknown[]) => ({
    id: row[0] as number,
    userId: row[1] as number,
    floor: row[2] as number,
    positionStart: row[3] as number,
    positionEnd: row[4] as number,
    roomType: row[5] as Room['roomType'],
    description: row[6] as string | undefined,
    name: row[7] as string | undefined,
    characterName: row[8] as string | undefined,
    isOutdoor: row[9] === 1
  }))
}

export async function createRoom(
  userId: number,
  floor: number,
  positionStart: number,
  positionEnd: number,
  roomType: Room['roomType'] = 'empty',
  description?: string,
  name?: string
): Promise<Room | null> {
  const db = await getDb()
  const safeUserId = safeInt(userId)

  const existingRooms = await getRoomsByUser(safeUserId)
  const placements = existingRooms.map((r) => ({
    floor: r.floor,
    positionStart: r.positionStart,
    positionEnd: r.positionEnd
  }))

  const validation = validatePlacement(placements, { floor, positionStart, positionEnd })
  if (!validation.valid) {
    return null
  }

  const safeFloor = safeInt(floor)
  const safePositionStart = safeInt(positionStart)
  const safePositionEnd = safeInt(positionEnd)
  const safeRoomType = safeSqlString(roomType)
  const desc = description ? `'${safeSqlString(description)}'` : 'NULL'
  const roomName = name ? `'${safeSqlString(name)}'` : 'NULL'
  
  db.run(
    `INSERT INTO rooms (user_id, floor, position_start, position_end, room_type, description, name, is_outdoor)
     VALUES (${safeUserId}, ${safeFloor}, ${safePositionStart}, ${safePositionEnd}, '${safeRoomType}', ${desc}, ${roomName}, 0)`
  )
  saveDb()

  // Get the ID of the inserted room
  const result = db.exec(`SELECT id FROM rooms WHERE user_id = ${safeUserId} ORDER BY id DESC LIMIT 1`)
  const id = result[0].values[0][0] as number

  return {
    id,
    userId,
    floor,
    positionStart,
    positionEnd,
    roomType,
    description,
    name,
    isOutdoor: false
  }
}

export async function updateRoomType(
  roomId: number,
  roomType: Room['roomType'],
  description?: string,
  name?: string
): Promise<void> {
  const db = await getDb()
  const desc = description ? `'${description.replace(/'/g, "''")}'` : 'NULL'
  const roomName = name ? `'${name.replace(/'/g, "''")}'` : 'NULL'
  
  db.run(
    `UPDATE rooms SET room_type = '${roomType}', description = ${desc}, name = ${roomName} WHERE id = ${roomId}`
  )
  saveDb()
}

export async function deleteRoom(roomId: number): Promise<number> {
  const db = await getDb()
  const safeRoomId = safeInt(roomId)
  
  const result = db.exec(
    `SELECT room_type, position_end - position_start as cells FROM rooms WHERE id = ${safeRoomId}`
  )
  
  if (!result || result.length === 0 || !result[0].values || result[0].values.length === 0) {
    return 0
  }
  
  const row = result[0].values[0]
  const roomType = row[0] as string
  const cells = row[1] as number
  
  db.run(`DELETE FROM rooms WHERE id = ${safeRoomId}`)
  saveDb()
  
  return calculateDemolishRefund(roomType, cells)
}

export async function getMaxFloor(userId: number): Promise<number> {
  const db = await getDb()
  const safeUserId = safeInt(userId)
  const result = db.exec(
    `SELECT MAX(floor) FROM rooms WHERE user_id = ${safeUserId}`
  )

  if (!result || result.length === 0 || !result[0].values || result[0].values[0][0] === null) {
    return 1  // 默认从1楼开始
  }

  return result[0].values[0][0] as number
}

export async function addNewFloor(userId: number): Promise<number> {
  const maxFloor = await getMaxFloor(userId)
  // 每次添加一层，无论是地上还是地下
  // 从1楼开始，添加楼层时从2楼开始递增
  // 如果需要添加地下室，需要单独的逻辑
  return maxFloor + 1
}
