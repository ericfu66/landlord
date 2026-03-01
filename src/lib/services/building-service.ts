import { getDb, saveDb } from '@/lib/db'
import { Room, RoomPlacement, BUILD_COSTS, FLOOR_CELLS } from '@/types/room'

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

export async function getRoomsBySave(saveId: number): Promise<Room[]> {
  const db = await getDb()
  const result = db.exec(
    `SELECT id, save_id, floor, position_start, position_end, room_type, description, character_name, is_outdoor
     FROM rooms WHERE save_id = ? ORDER BY floor, position_start`,
    [saveId]
  )

  if (result.length === 0) {
    return []
  }

  return result[0].values.map((row) => ({
    id: row[0] as number,
    saveId: row[1] as number,
    floor: row[2] as number,
    positionStart: row[3] as number,
    positionEnd: row[4] as number,
    roomType: row[5] as Room['roomType'],
    description: row[6] as string | undefined,
    characterName: row[7] as string | undefined,
    isOutdoor: row[8] === 1
  }))
}

export async function createRoom(
  saveId: number,
  floor: number,
  positionStart: number,
  positionEnd: number,
  roomType: Room['roomType'] = 'empty',
  description?: string
): Promise<Room | null> {
  const db = await getDb()

  const existingRooms = await getRoomsBySave(saveId)
  const placements = existingRooms.map((r) => ({
    floor: r.floor,
    positionStart: r.positionStart,
    positionEnd: r.positionEnd
  }))

  const validation = validatePlacement(placements, { floor, positionStart, positionEnd })
  if (!validation.valid) {
    return null
  }

  db.run(
    `INSERT INTO rooms (save_id, floor, position_start, position_end, room_type, description, is_outdoor)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [saveId, floor, positionStart, positionEnd, roomType, description || null, 0]
  )
  saveDb()

  const result = db.exec('SELECT last_insert_rowid()')
  const id = result[0].values[0][0] as number

  return {
    id,
    saveId,
    floor,
    positionStart,
    positionEnd,
    roomType,
    description,
    isOutdoor: false
  }
}

export async function updateRoomType(
  roomId: number,
  roomType: Room['roomType'],
  description?: string
): Promise<void> {
  const db = await getDb()
  db.run(
    'UPDATE rooms SET room_type = ?, description = ? WHERE id = ?',
    [roomType, description || null, roomId]
  )
  saveDb()
}

export async function deleteRoom(roomId: number): Promise<number> {
  const db = await getDb()
  
  const result = db.exec(
    'SELECT room_type, position_end - position_start as cells FROM rooms WHERE id = ?',
    [roomId]
  )
  
  if (result.length === 0) {
    return 0
  }
  
  const row = result[0].values[0]
  const roomType = row[0] as string
  const cells = row[1] as number
  
  db.run('DELETE FROM rooms WHERE id = ?', [roomId])
  saveDb()
  
  return calculateDemolishRefund(roomType, cells)
}

export async function getMaxFloor(saveId: number): Promise<number> {
  const db = await getDb()
  const result = db.exec(
    'SELECT MAX(floor) FROM rooms WHERE save_id = ?',
    [saveId]
  )
  
  if (result.length === 0 || result[0].values[0][0] === null) {
    return 0
  }
  
  return result[0].values[0][0] as number
}

export async function addNewFloor(saveId: number): Promise<number> {
  const maxFloor = await getMaxFloor(saveId)
  return maxFloor + 1
}