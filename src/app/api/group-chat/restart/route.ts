import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { restartGroupChatContext } from '@/lib/services/group-chat-summary-service'

interface RestartBody {
  keepRecentCount?: number
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = (await request.json()) as RestartBody
    const keepRecentCount = Number.isFinite(body.keepRecentCount)
      ? Math.max(0, body.keepRecentCount as number)
      : 3

    const result = await restartGroupChatContext(session.userId, keepRecentCount)

    return NextResponse.json({ ok: true, created: result.created })
  } catch (error) {
    console.error('Group chat restart error:', error)
    return NextResponse.json({ error: '重启对话失败' }, { status: 500 })
  }
}
