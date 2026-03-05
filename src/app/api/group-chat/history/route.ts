import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getGroupChatHistory } from '@/lib/services/group-chat-service'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Number(searchParams.get('limit') ?? '50')
    const offset = Number(searchParams.get('offset') ?? '0')

    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(100, limit)) : 50
    const safeOffset = Number.isFinite(offset) ? Math.max(0, offset) : 0

    const messages = await getGroupChatHistory(session.userId, safeLimit, safeOffset)
    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Group chat history error:', error)
    return NextResponse.json({ error: '获取群聊历史失败' }, { status: 500 })
  }
}
