import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getVisitHistory } from '@/lib/services/multiplayer-service'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const history = await getVisitHistory(session.userId)
    return NextResponse.json({ history })
  } catch (error) {
    console.error('Get visit history error:', error)
    return NextResponse.json({ error: '获取访问历史失败' }, { status: 500 })
  }
}
