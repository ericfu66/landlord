import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getUserById } from '@/lib/auth/repo'
import { createCharacter, SpecialVariableData } from '@/lib/services/recruit-service'
import { getGameState, updateGameState } from '@/lib/services/economy-service'
import { getDb } from '@/lib/db'
import { updateTaskProgress } from '@/lib/services/task-service'

async function checkAvailableRoom(userId: number): Promise<{ hasRoom: boolean; roomId?: number }> {
  const db = await getDb()
  
  const result = db.exec(
    `SELECT id FROM rooms WHERE user_id = ${userId} AND character_name IS NULL LIMIT 1`
  )
  
  if (result && result.length > 0 && result[0].values && result[0].values.length > 0) {
    return { hasRoom: true, roomId: result[0].values[0][0] as number }
  }
  
  return { hasRoom: false }
}

async function countAvailableRooms(userId: number): Promise<number> {
  const db = await getDb()
  
  const result = db.exec(
    `SELECT COUNT(*) FROM rooms WHERE user_id = ${userId} AND character_name IS NULL`
  )
  
  if (result && result.length > 0 && result[0].values && result[0].values.length > 0) {
    return result[0].values[0][0] as number
  }
  
  return 0
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const availableCount = await countAvailableRooms(session.userId)
    
    return NextResponse.json({ availableCount })
  } catch (error) {
    console.error('Get available rooms error:', error)
    return NextResponse.json({ error: '获取空房间数量失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { character, roomId, portraitUrl, worldviewId, specialVar } = body

    if (!character) {
      return NextResponse.json({ error: '缺少角色数据' }, { status: 400 })
    }

    // 检查是否有空房间
    const { hasRoom, roomId: availableRoomId } = await checkAvailableRoom(session.userId)
    
    if (!hasRoom) {
      return NextResponse.json({ error: '没有空房间！请先建造房间' }, { status: 400 })
    }

    // 确保游戏状态存在
    let gameState = await getGameState(session.userId)
    if (!gameState) {
      await updateGameState(session.userId, {
        currency: 1000,
        energy: 3,
        debtDays: 0,
        totalFloors: 1,
        weather: '晴',
        currentTime: '08:00'
      })
    }

    // 使用找到的空房间ID，如果没有传入roomId则使用找到的空房间
    const finalRoomId = roomId || availableRoomId
    const specialVarData = specialVar as SpecialVariableData | undefined
    const newCharacter = await createCharacter(session.userId, character, finalRoomId, worldviewId, specialVarData)

    if (!newCharacter) {
      return NextResponse.json({ error: '角色已存在或创建失败' }, { status: 400 })
    }

    if (portraitUrl) {
      const { updateCharacterPortrait } = await import('@/lib/services/recruit-service')
      await updateCharacterPortrait(newCharacter.name, portraitUrl)
    }

    // 更新招募任务进度
    updateTaskProgress(session.userId, 'recruit').catch(() => {})

    return NextResponse.json({ success: true, character: newCharacter })
  } catch (error) {
    console.error('Confirm recruit error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '招募失败' },
      { status: 500 }
    )
  }
}
