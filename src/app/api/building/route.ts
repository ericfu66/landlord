import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getDb } from '@/lib/db'
import { getRoomsBySave, createRoom, updateRoomType, deleteRoom, addNewFloor } from '@/lib/services/building-service'
import { calculateBuildCost } from '@/lib/services/building-service'

async function getCurrentSaveId(userId: number): Promise<number | null> {
  const db = await getDb()
  const result = db.exec(
    'SELECT id FROM saves WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
    [userId]
  )
  
  if (result.length === 0 || result[0].values.length === 0) {
    return null
  }
  
  return result[0].values[0][0] as number
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const saveId = await getCurrentSaveId(session.userId)
    if (!saveId) {
      return NextResponse.json({ rooms: [], floors: 1 })
    }

    const rooms = await getRoomsBySave(saveId)
    const maxFloor = Math.max(1, ...rooms.map((r) => r.floor))

    return NextResponse.json({ rooms, floors: maxFloor })
  } catch (error) {
    console.error('Get rooms error:', error)
    return NextResponse.json({ error: '获取房间失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { action, floor, positionStart, positionEnd, roomType, description, roomId, isNewFloor } = body

    let saveId = await getCurrentSaveId(session.userId)
    
    if (!saveId) {
      const db = await getDb()
      db.run(
        'INSERT INTO saves (user_id, save_name, game_data) VALUES (?, ?, ?)',
        [session.userId, '自动存档', JSON.stringify({})]
      )
      const result = db.exec('SELECT last_insert_rowid()')
      saveId = result[0].values[0][0] as number
    }

    switch (action) {
      case 'create': {
        const cellCount = positionEnd - positionStart
        const cost = calculateBuildCost(roomType, cellCount, isNewFloor || false)
        
        const room = await createRoom(saveId, floor, positionStart, positionEnd, roomType, description)
        
        if (!room) {
          return NextResponse.json({ error: '房间位置无效或重叠' }, { status: 400 })
        }
        
        return NextResponse.json({ room, cost })
      }
      
      case 'update': {
        await updateRoomType(roomId, roomType, description)
        return NextResponse.json({ success: true })
      }
      
      case 'delete': {
        const refund = await deleteRoom(roomId)
        return NextResponse.json({ success: true, refund })
      }
      
      case 'addFloor': {
        const newFloor = await addNewFloor(saveId)
        const cost = calculateBuildCost('empty', 0, true)
        return NextResponse.json({ floor: newFloor, cost })
      }
      
      default:
        return NextResponse.json({ error: '未知操作' }, { status: 400 })
    }
  } catch (error) {
    console.error('Building action error:', error)
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
}