import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getMultiplayerSettings, updateMultiplayerSettings } from '@/lib/services/multiplayer-service'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const settings = await getMultiplayerSettings(session.userId)
    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Get multiplayer settings error:', error)
    return NextResponse.json({ error: '获取联机设置失败' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const body = await request.json()
    const { allowVisits, allowInteractions, allowCharacterInteractions } = body
    
    const settings = await updateMultiplayerSettings(session.userId, {
      allowVisits,
      allowInteractions,
      allowCharacterInteractions
    })
    
    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Update multiplayer settings error:', error)
    return NextResponse.json({ error: '更新联机设置失败' }, { status: 500 })
  }
}
