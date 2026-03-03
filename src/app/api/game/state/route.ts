import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getUserById } from '@/lib/auth/repo'
import { getGameState, updateGameState } from '@/lib/services/economy-service'
import { getCurrentGameState } from '@/lib/services/save-service'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const user = await getUserById(session.userId)
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // Ensure game state exists by getting it (will create defaults if needed)
    let gameState = await getGameState(session.userId)
    if (!gameState) {
      // Initialize default game state for new user
      await updateGameState(session.userId, {
        currency: 1000,
        energy: 3,
        debtDays: 0,
        totalFloors: 1,
        weather: '晴',
        currentTime: '08:00'
      })
      gameState = await getGameState(session.userId)
    }

    const currentState = await getCurrentGameState(session.userId)

    return NextResponse.json({
      state: gameState,
      userId: session.userId,
      username: user.username,
      characterCount: currentState?.characterCount || 0,
      roomCount: currentState?.roomCount || 0
    })
  } catch (error) {
    console.error('Get game state error:', error)
    return NextResponse.json(
      { error: '获取游戏状态失败' },
      { status: 500 }
    )
  }
}
