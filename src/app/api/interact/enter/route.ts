import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { deductEnergy } from '@/lib/services/economy-service'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { characterName } = body as { characterName: string }

    if (!characterName) {
      return NextResponse.json({ error: '缺少角色名称' }, { status: 400 })
    }

    // 扣除体力（进入互动消耗 1 点）
    const hasEnoughEnergy = await deductEnergy(session.userId, 1)
    if (!hasEnoughEnergy) {
      return NextResponse.json({ error: '体力不足！请等待体力恢复或推进到下一天' }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true,
      message: '进入互动成功，已消耗 1 点体力'
    })
  } catch (error) {
    console.error('Enter interaction error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '进入互动失败' },
      { status: 500 }
    )
  }
}
